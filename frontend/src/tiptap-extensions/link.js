import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Link } from "@tiptap/extension-link";

export const EnhancedLink = Link.extend({
  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: this.options.HTMLAttributes.target,
      },
      class: {
        default: this.options.HTMLAttributes.class,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("linkClickHandler"),
        props: {
          handleDoubleClick: (view, _pos, event) => {
						if (event.button !== 0) {
							return;
						}
						const link = event.target?.closest("a");
						if (!link) {
							return;
						}
            const href = event.target.getAttribute("href");
            window.open(href, '_self', '');
            return true;
          },
          handleClick: (view, _pos, event) => {
						if (event.button !== 1) {
							return;
						}
            const href = event.target.getAttribute("href");
            window.open(href, '_blank', 'noopener noreferrer');
            return true;
          },
        },
      }),
    ];
  },
});
