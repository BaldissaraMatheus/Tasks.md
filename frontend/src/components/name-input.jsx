import { onMount } from "solid-js";
import { handleKeyDown } from "../utils";

/**
 * 
 * @param {Object} props 
 * @param {string} props.errorMsg 
 * @param {string} props.value 
 * @param {Function} props.onChange 
 * @param {Function} props.onCancel 
 * @param {Function} props.onConfirm 
 * @returns 
 */
export function NameInput(props) {
  onMount(() => {
    const input = document.getElementById('rename-input');
    input.focus();
    input.setSelectionRange(0, props.value.length);
  });

  function handleConfirm() {
    if (props.errorMsg) {
      props.onCancel();
      return;
    }
    props.onConfirm();
  }

  return (
    <div class="input-and-error-msg">
      <input
        type="text"
        id="rename-input"
        value={props.value}
        onInput={(e) => props.onChange(e.target.value)}
        onFocusOut={handleConfirm}
        onKeyDown={e => handleKeyDown(e, handleConfirm, props.onCancel)}
        class={props.errorMsg ? "error" : ""}
      />
      {props.errorMsg ? <span class="error-msg">{props.errorMsg}</span> : <></>}
    </div>
  );
}
