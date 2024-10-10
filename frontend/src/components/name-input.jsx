import { onMount } from "solid-js";
import { handleKeyDown, clickOutside } from "../utils";

/**
 *
 * @param {Object} props
 * @param {string} props.errorMsg
 * @param {string} props.value
 * @param {string} props.class
 * @param {Function} props.onChange
 * @param {Function} props.onCancel
 * @param {Function} props.onConfirm
 * @param {HTMLElement} props.datalist
 * @param {string} props.list
 * @returns
 */
export function NameInput(props) {
	let inputRef;

	onMount(() => {
		inputRef.focus();
		inputRef.setSelectionRange(0, props.value.length);
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
				ref={(el) => {
					inputRef = el;
				}}
				type="text"
				class={`${props.class ||  ''} ${props.errorMsg ? "input-error" : ""}`}
				value={props.value}
				onInput={(e) => props.onChange(e.target.value)}
				onFocusOut={handleConfirm}
				use:clickOutside={handleConfirm}
				onKeyDown={(e) => handleKeyDown(e, handleConfirm, props.onCancel)}
				onClick={handleClick}
				list={props.list || ''}
			/>
			{props.datalist || null}
			{props.errorMsg ? <span class="error-msg">{props.errorMsg}</span> : <></>}
		</div>
	);
}
