import { createSignal, createEffect } from "solid-js";
import { clickOutside, handleKeyDown } from "../utils";

/**
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {boolean} props.open
 * @param {number} props.x
 * @param {number} props.y
 * @param {Function} props.onClose
 * @param {Object[]} props.options
 */
export function Menu(props) {
	const [confirmationPromptCb, setConfirmationPromptCb] = createSignal(null);
	let menuRef;
	let confirmBtnRef;

	function close() {
		setConfirmationPromptCb(null);
		props.onClose();
	}

	function handleOptionClick(option, focus) {
		if (option.requiresConfirmation) {
			setConfirmationPromptCb(() => option.onClick);
			if (focus) {
				setTimeout(() => {
					confirmBtnRef.focus();
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

	return (
		<Show when={props.open}>
			<div
				popover
				id={props.id}
				ref={(el) => {
					menuRef = el;
				}}
				class="popup"
				use:clickOutside={close}
				style={{
					top: `${props.y}px`,
					left: `${props.x}px`,
				}}
			>
				<Show
					when={confirmationPromptCb()}
					fallback={props.options.map((option) => (
						<button
							type="button"
							popoverTarget={option.popoverTarget}
							onClick={() => handleOptionClick(option)}
							onKeyDown={(e) =>
								handleKeyDown(
									e,
									() => handleOptionClick(option, true),
									props.onClose,
								)
							}
						>
							{option.label}
						</button>
					))}
				>
					<button
						ref={(el) => {
							confirmBtnRef = el;
						}}
						type="button"
						onClick={handleOptionConfirmation}
						onKeyDown={(e) =>
							handleKeyDown(e, () => handleOptionConfirmation(e), close)
						}
					>
						Are you sure?
					</button>
					<button
						type="button"
						onClick={close}
						onKeyDown={(e) => handleKeyDown(e, close, close)}
					>
						Cancel
					</button>
				</Show>
			</div>
		</Show>
	);
}
