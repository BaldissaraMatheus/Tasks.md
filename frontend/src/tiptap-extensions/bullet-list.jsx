import { mergeAttributes, Node, InputRule } from "@tiptap/core";
import { findWrapping } from "@tiptap/pm/transform";

const ListItemName = "listItem";
const TextStyleName = "textStyle";

/**
 * Matches a bullet list to a dash or asterisk.
 */
export const inputRegex = /^\s*([-+*]) [^\s]/;

/**
 * This extension allows you to create bullet lists.
 * This requires the ListItem extension
 * @see https://tiptap.dev/api/nodes/bullet-list
 * @see https://tiptap.dev/api/nodes/list-item.
 */
export const BulletList = Node.create({
  name: "bulletList",

  addOptions() {
    return {
      itemTypeName: "listItem",
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false,
    };
  },

  addAttributes() {
    return {
      word: {
        default: false,
        keepOnSplit: false,
        parseHTML: (element) => {
          const dataChecked = element.getAttribute("word");

          return dataChecked === "" || dataChecked === "true";
        },
        renderHTML: (attributes) => {
          if (!attributes.word) {
            return {};
          }
          console.log(attributes.word?.[0].substring(2));
          return { word: attributes.word };
        },
      },
    };
  },

  group: "block list",

  content() {
    return `${this.options.itemTypeName}+`;
  },

  parseHTML() {
    return [{ tag: "ul" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      toggleBulletList:
        () =>
        ({ commands, chain }) => {
          if (this.options.keepAttributes) {
            return chain()
              .toggleList(
                this.name,
                this.options.itemTypeName,
                this.options.keepMarks
              )
              .updateAttributes(
                ListItemName,
                this.editor.getAttributes(TextStyleName)
              )
              .run();
          }
          return commands.toggleList(
            this.name,
            this.options.itemTypeName,
            this.options.keepMarks
          );
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": () => this.editor.commands.toggleBulletList(),
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^\s*([-+*]) (.*)/,
        handler: ({ state, range, match, chain }) => {
          const attributes = match || {};
          const tr = state.tr.delete(range.from, range.to);
          const $start = tr.doc.resolve(range.from);
          const blockRange = $start.blockRange();
          const wrapper =
            blockRange && findWrapping(blockRange, this.type, attributes);

          const matchText = match[2];
          const matchTextLength = matchText.length;
          const brackets = ["[ ]", "[x]", "[X]"];
          if (
            brackets.some((breakedOption) =>
              matchText.startsWith(breakedOption.substring(0, matchTextLength))
            )
          ) {
            return null;
          }

          // tr.insertText(matchText.trim(), range.to - 1)
          tr.wrap(blockRange, wrapper);
          const paragraph = this.editor.schema.text(matchText);
          tr.replaceRangeWith(range.from, range.to, paragraph);
          if (this.keepMarks && this.editor) {
            const { selection, storedMarks } = state;
            const { splittableMarks } = this.editor.extensionManager;
            const marks =
              storedMarks ||
              (selection.$to.parentOffset && selection.$from.marks());

            if (marks) {
              const filteredMarks = marks.filter((mark) =>
                splittableMarks.includes(mark.type.name)
              );

              tr.ensureMarks(filteredMarks);
            }
          }
          if (this.keepAttributes) {
            const nodeType = "listItem";
            chain().updateAttributes(nodeType, attributes).run();
          }
          const before = tr.doc.resolve(range.from - 1).nodeBefore;

          if (
            before &&
            before.type === this.type &&
            canJoin(tr.doc, range.from - 1) &&
            (!this.joinPredicate || this.joinPredicate(match, before))
          ) {
            tr.join(range.from - 1);
          }
        },
      }),
    ];
  },
});
