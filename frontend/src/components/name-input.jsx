import { onMount } from "solid-js";
import { handleKeyDown, clickOutside } from "../utils";

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
		// TODO use ref instead
		const input = document.getElementById("rename-input");
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

	function handleClick(e) {
		e.stopPropagation();
	}

	return (
		<div class="input-and-error-msg">
			<input
				type="text"
				id="rename-input"
				class={props.errorMsg ? "error" : ""}
				value={props.value}
				onInput={(e) => props.onChange(e.target.value)}
				onFocusOut={handleConfirm}
				use:clickOutside={handleConfirm}
				onKeyDown={(e) => handleKeyDown(e, handleConfirm, props.onCancel)}
				onClick={handleClick}
			/>
			{props.errorMsg ? <span class="error-msg">{props.errorMsg}</span> : <></>}
		</div>
	);
}
