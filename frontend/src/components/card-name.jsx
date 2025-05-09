import { createSignal } from "solid-js";
import { Menu } from "./menu";
import { getButtonCoordinates, handleKeyDown } from "../utils";
import { Portal } from "solid-js/web";
import { IconEllipsisVertical } from '@stackoverflow/stacks-icons/icons'

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
		event.stopImmediatePropagation();
		event.stopPropagation();
		event.preventDefault();
	}

	function handleCancel() {
		setShowMenu(false);
	}

	return (
		<>
			<div class="card__name">
				{props.hasContent ? "\uD83D\uDCDD " : ""}
				{props.name}
			</div>
			<div class="header-buttons">
				<button
					type="button"
					title="Show card options"
					class="small"
					popoverTarget={`${props.name}-card-options`}
					onClick={handleClickCardOptions}
					onKeyDown={(e) =>
						handleKeyDown(
							e,
							() => handleClickCardOptions(e, true),
							handleCancel,
						)
					}
				>
					<span innerHTML={IconEllipsisVertical} />
				</button>
			</div>
			{showMenu() ? (
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
			) : null}
		</>
	);
}
