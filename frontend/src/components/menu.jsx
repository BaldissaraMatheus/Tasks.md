import { createSignal, createEffect } from "solid-js";
import { clickOutside, handleKeyDown } from "../utils";
import { Portal } from "solid-js/web";

/**
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {boolean} props.open
 * @param {number} props.x
 * @param {number} props.y
 * @param {Function} props.onClick
 * @param {Function} props.onClose
 * @param {Object[]} props.options
 */
export function Menu(props) {
  const [confirmationPromptCb, setConfirmationPromptCb] = createSignal(null);
  let menuRef;

  function close() {
    setConfirmationPromptCb(null);
    props.onClose();
  }

  function handleOptionClick(option, focus) {
    if (option.requiresConfirmation) {
      setConfirmationPromptCb(() => option.onClick);
      if (focus) {
        setTimeout(() => {
          document.getElementById("confirm-btn").focus();
        }, 0);
      }
      return;
    }
    option.onClick();
    props.onClose();
  }

  function handleOptionConfirmation(e) {
    e.stopImmediatePropagation();
    confirmationPromptCb()();
    setConfirmationPromptCb(null);
    props.onClose();
  }

  createEffect(() => {
    if (props.open) {
      menuRef.children[0].focus();
    }
  });

  return (<Portal>
    <popover
      id={props.id}
      ref={el => {menuRef = el}}
      class="popup"
      use:clickOutside={close}
      style={{
        top: `${props.y}px`,
        left: `${props.x}px`,
      }}
    >
      <Show when={props.open && !confirmationPromptCb()}>
        {props.options.map((option) => (
          <button
            onClick={() => handleOptionClick(option)}
            onKeyDown={(e) =>
              handleKeyDown(e, () => handleOptionClick(option, true), props.onClose)
            }
          >
            {option.label}
          </button>
        ))}
      </Show>
      <Show when={confirmationPromptCb()}>
        <button
          onClick={handleOptionConfirmation}
          id="confirm-btn"
          onKeyDown={(e) =>
            handleKeyDown(e, () => handleOptionConfirmation(e), close)
          }
        >
          Are you sure?
        </button>
        <button
          onClick={close}
          onKeyDown={(e) =>
            handleKeyDown(e, close, close)
          }
        >
          Cancel
        </button>
      </Show>
    </popover>
  </Portal>
  );
}
