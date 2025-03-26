import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Node } from "@tiptap/core";

let uploadFn;
let imagePreview = "";

const UploadImage = Node.create({
  name: "uploadImage",
  onCreate() {
    uploadFn = this.options.uploadFn;
  },
  addOptions() {
    return {
      ...this.parent?.(),
      uploadFn: async () => {
        return "";
      },
    };
  },
  addProseMirrorPlugins() {
    return [placeholderPlugin];
  },
  addCommands() {
    return {
      ...this.parent?.(),
      addImage: (file, dragPos) => () => {
        const view = this.editor.view;
        const schema = this.editor.schema;
        if (file) {
          startImageUpload(view, file, schema, dragPos);
          return true;
        }
        const fileHolder = document.createElement("input");
        fileHolder.setAttribute("type", "file");
        fileHolder.setAttribute("accept", "image/*");
        fileHolder.setAttribute("style", "visibility:hidden");
        document.body.appendChild(fileHolder);

        fileHolder.addEventListener("change", (e) => {
          if (
            view.state.selection.$from.parent.inlineContent &&
            e.target?.files?.length
          ) {
            startImageUpload(view, e.target?.files[0], schema);
          }
          view.focus();
        });
        fileHolder.click();
        return true;
      },
    };
  },
  addInputRules() {
    return [];
  },
});

//Plugin for placeholder
const placeholderPlugin = new Plugin({
  state: {
    init() {
      return DecorationSet.empty;
    },
    apply(tr, set) {
      let newSet = set;
      // Adjust decoration positions to changes made by the transaction
      newSet = set.map(tr.mapping, tr.doc);
      // See if the transaction adds or removes any placeholders
      const action = tr.getMeta(this);
      if (action?.add) {
        const widget = document.createElement("div");
        const img = document.createElement("img");
        widget.classList.value = "image-uploading";
        img.src = imagePreview;
        widget.appendChild(img);
        const deco = Decoration.widget(action.add.pos, widget, {
          id: action.add.id,
        });
        newSet = set.add(tr.doc, [deco]);
      } else if (action?.remove) {
        newSet = set.remove(
          set.find(undefined, undefined, (spec) => spec.id === action.remove.id)
        );
      }
      return newSet;
    },
  },
  props: {
    decorations(state) {
      return this.getState(state);
    },
  },
});

//Find the placeholder in editor
function findPlaceholder(state, id) {
  const decos = placeholderPlugin.getState(state);
  const found = decos?.find(undefined, undefined, (spec) => spec.id === id);

  return found?.length ? found[0].from : null;
}

function startImageUpload(view, file, schema, dragPos) {
  imagePreview = URL.createObjectURL(file);
  // A fresh object to act as the ID for this upload
  const id = {};

  // Replace the selection with a placeholder
  const tr = view.state.tr;
  if (!dragPos && !tr.selection.empty) {
    tr.deleteSelection();
  }
  tr.setMeta(placeholderPlugin, { add: { id, pos: dragPos || tr.selection.from } });
  view.dispatch(tr);
  uploadFn(file).then(
    (url) => {
      // If the content around the placeholder has been deleted, drop
      // the image
      const pos = dragPos || findPlaceholder(view.state, id);
      if (pos === null) returnfindPlaceholder;
      // Otherwise, insert it at the placeholder's position, and remove
      // the placeholder
      view.dispatch(
        view.state.tr
          // TODO fix positiona (breaking line when shouldnt)
          .replaceWith(pos, pos, schema.nodes.image.create({ src: url }))
          .setMeta(placeholderPlugin, { remove: { id } })
      );
    },
    (e) => {
      // On failure, just clean up the placeholder
      view.dispatch(tr.setMeta(placeholderPlugin, { remove: { id } }));
    }
  );
}
export { UploadImage };
