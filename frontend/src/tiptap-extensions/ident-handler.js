import { Extension } from "@tiptap/core";

const TAB_CHAR = "\u0009";

const IndentHandler = Extension.create({
  name: "indentHandler",
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        // Check if we're at the start of a list item
        if (editor.isActive("listItem") && $from.parentOffset === 0) {
          // Attempt to sink the list item
          const sinkResult = editor.chain().sinkListItem("listItem").run();

          // If sinking was successful, return true
          if (sinkResult) {
            return true;
          }
          // If sinking failed, we'll fall through to inserting a tab
        }

        if (editor.isActive("taskItem") && $from.parentOffset === 0) {
          const sinkResult = editor.chain().sinkListItem("taskItem").run();
          if (sinkResult) {
            return true;
          }
        }

        // Insert a tab character
        editor
          .chain()
          .command(({ tr }) => {
            tr.insertText(TAB_CHAR);
            return true;
          })
          .run();

        // Prevent default behavior (losing focus)
        return true;
      },
      "Shift-Tab": ({ editor }) => {
        const { selection, doc } = editor.state;
        const { $from } = selection;
        const pos = $from.pos;

        // Check if we're at the start of a list item
        if (editor.isActive("listItem") && $from.parentOffset === 0) {
          // If so, lift the list item
          return editor.chain().liftListItem("listItem").run();
        }

        if (editor.isActive("taskItem") && $from.parentOffset === 0) {
          // If so, lift the list item
          return editor.chain().liftListItem("taskItem").run();
        }

        // Check if the previous character is a tab
        if (doc.textBetween(pos - 1, pos) === TAB_CHAR) {
          // If so, delete it
          editor
            .chain()
            .command(({ tr }) => {
              tr.delete(pos - 1, pos);
              return true;
            })
            .run();
          return true;
        }

        // Prevent default behavior (losing focus)
        return true;
      },
    };
  },
});

export { IndentHandler };