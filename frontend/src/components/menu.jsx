import { createSignal, onMount, onCleanup } from "solid-js";
import { handleKeyDown } from "../utils";

/**
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {number} props.x
 * @param {number} props.y
 * @param {Function} props.onClick
 * @param {Function} props.onClose
 * @param {Object[]} props.options
 */
export function Menu(props) {
  const [confirmationPromptCb, setConfirmationPromptCb] = createSignal(null);

  function handleClickOutsideOptions(event) {
    if (props.open && event.target?.parentElement?.id !== props.id) {
      setConfirmationPromptCb(null);
      props.onClose();
    }
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

  function handleCancel() {
    setConfirmationPromptCb(null);
    props.onClose();
  }

  onMount(async () => {
    window.addEventListener("mousedown", handleClickOutsideOptions);
  });

  onCleanup(() => {
    window.removeEventListener("mousedown", handleClickOutsideOptions);
  });

  return (
    <div
      id={props.id}
      class="popup"
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
            handleKeyDown(e, () => handleOptionConfirmation(e), handleCancel)
          }
        >
          Are you sure?
        </button>
        <button
          onClick={handleCancel}
          onKeyDown={(e) =>
            handleKeyDown(e, handleCancel, handleCancel)
          }
        >
          Cancel
        </button>
      </Show>
    </div>
  );
}
