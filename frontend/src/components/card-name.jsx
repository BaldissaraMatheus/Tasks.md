import { createSignal } from "solid-js";
import { Menu } from "./menu";
import { getButtonCoordinates, handleKeyDown } from "../utils";
import { BiRegularDotsVerticalRounded } from "solid-icons/bi";
import { Portal } from "solid-js/web";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {boolean} props.hasContent
 * @param {Function} props.onRenameBtnClick
 * @param {Function} props.onDelete
 */
export function CardName(props) {
	const [showMenu, setShowMenu] = createSignal(false);
	const [menuCoordinates, setMenuCoordinates] = createSignal();

	function startRenamingCard() {
		setShowMenu(false);
		props.onRenameBtnClick();
	}

	function handleMenuClose() {
		setShowMenu(false);
		setMenuCoordinates(null);
	}

	const menuOptions = [
		{ label: "Rename card", onClick: startRenamingCard },
		{
			label: "Delete card",
			onClick: props.onDelete,
			requiresConfirmation: true,
		},
	];

	function handleClickCardOptions(event, focus) {
		const coordinates = getButtonCoordinates(event);
		setMenuCoordinates(coordinates);
		setShowMenu(true);
		if (focus) {
			document.getElementById(props.name).firstChild.focus();
		}
		event.stopImmediatePropagation();
		event.stopPropagation();
		event.preventDefault();
	}

	function handleCancel() {
		setShowMenu(false);
	}

	return (
		<>
			<strong class="card__name">
				{props.hasContent ? "\uD83D\uDCDD " : ""}
				{props.name}
			</strong>
			<div class="header-buttons">
				<button
					type="button"
					title="Show card options"
					class="small"
					popoverTarget={`${props.name}-card-options`}
					onClick={handleClickCardOptions}
					onKeyDown={(e) =>
						handleKeyDown(e, () => handleClickCardOptions(e, true), handleCancel)
					}
				>
					<BiRegularDotsVerticalRounded />
				</button>
			</div>
			<Portal>
				<Menu
					id={`${props.name}-card-options`}
					open={showMenu()}
					options={menuOptions}
					onClose={handleMenuClose}
					x={menuCoordinates()?.x}
					y={menuCoordinates()?.y}
				/>
			</Portal>
		</>
	);
}
