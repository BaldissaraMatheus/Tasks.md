import { createSignal } from "solid-js";
import { Menu } from "./menu";
import { getButtonCoordinates, handleKeyDown } from "../utils";
import { AiOutlinePlus } from "solid-icons/ai";
import { BiRegularDotsVerticalRounded } from "solid-icons/bi";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {number} props.count
 * @param {Function} props.onRenameBtnClick
 * @param {Function} props.onDeleteCards
 * @param {Function} props.onDelete
 * @param {Function} props.onDragStart
 * @param {Function} props.onCreateNewCardBtnClick
 */
export function LaneName(props) {
	const [showMenu, setShowMenu] = createSignal(false);
	const [menuCoordinates, setMenuCoordinates] = createSignal();

	function startRenamingLane() {
		setShowMenu(false);
		props.onRenameBtnClick();
	}

	function handleCancel() {
		setShowMenu(false);
		setMenuCoordinates(null);
	}

	function handleOptionsBtnClick(e, focus) {
		e.preventDefault();
		e.stopPropagation();
		const coordinates = getButtonCoordinates(e);
		setMenuCoordinates(coordinates);
		setShowMenu(true);
		if (focus) {
			setTimeout(() => {
				document.getElementById(`menu-${props.name}`).firstChild.focus();
			}, 0);
		}
	}

	const menuOptions = [
		{ label: "Rename lane", onClick: startRenamingLane },
		{
			label: "Delete cards",
			onClick: props.onDeleteCards,
			requiresConfirmation: true,
		},
		{
			label: "Delete lane",
			onClick: props.onDelete,
			requiresConfirmation: true,
		},
	];

	return (
		<>
			<div
				class="lane__header-name-and-count"
				draggable={true}
				onDragEnter={(e) => e.preventDefault()}
				onDragStart={props.onDragStart}
			>
				<strong class="lane__header-name">{props.name}</strong>
				<div class="tag">
					<h5 class="counter">{props.count}</h5>
				</div>
			</div>
			<div class="header-buttons">
				<button
					type="button"
					title="Create new card"
					class="small"
					onClick={() => props.onCreateNewCardBtnClick()}
				>
					<AiOutlinePlus />
				</button>
				<button
					type="button"
					title="Show lane options"
					class="small"
					popoverTarget={`${props.name}-lane-options`}
					onClick={handleOptionsBtnClick}
					onKeyDown={(e) =>
						handleKeyDown(e, () => handleOptionsBtnClick(e, true), handleCancel)
					}
				>
					<BiRegularDotsVerticalRounded />
				</button>
			</div>
			{/* TODO should be a single menu within App component */}
			<Portal>
				<Menu
					id={`${props.name}-lane-options`}
					open={showMenu()}
					options={menuOptions}
					onClose={handleCancel}
					x={menuCoordinates()?.x}
					y={menuCoordinates()?.y}
				/>
			</Portal>
		</>
	);
}
