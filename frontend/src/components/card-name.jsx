import { createSignal } from "solid-js";
import { Menu } from "./menu";

/**
 * 
 * @param {Object} props 
 * @param {string} props.name 
 * @param {Function} props.onRenameBtnClick
 * @param {Function} props.onDelete
 * @param {Function} props.onDragStart
 */
export function CardName(props) {
  const [showMenu, setShowMenu] = createSignal(false);
  const [menuCoordinates, setMenuCoordinates] = createSignal();

  function startRenamingCard() {
    setShowMenu(false);
		props.onRenameBtnClick()
  }

  function handleOptionBtnOnClick(event) {
    event.stopPropagation();
    const btnCoordinates = event.target.getBoundingClientRect();
    let x = btnCoordinates.x + event.target.offsetWidth - 3;
    const menuWidth = 82;
    const offsetX = x + menuWidth >= window.innerWidth ? menuWidth : 0;
    x -= offsetX;
    const offsetY = offsetX ? 0 : 3;
    const y = btnCoordinates.y + event.target.offsetHeight - offsetY;
    setMenuCoordinates({ x, y });
  }

  function handleMenuClose() {
    setShowMenu(false);
    setMenuCoordinates(null);
  }

  const menuOptions = [
    { label: 'Rename card', onClick: startRenamingCard },
    { label: 'Delete card', onClick: props.onDelete, requiresConfirmation: true },
  ];

  return (
    <>
      <div
				class="lane__header-name-and-count"
				draggable={true}
				onDragEnter={(e) => e.preventDefault()}
				onDragStart={props.onDragStart}
			>
        <strong>{props.name}</strong>
      </div>
      <div class="lane__header-buttons">
        <button
          title="Show card options"
          class="small"
          onClick={(event) => {
            handleOptionBtnOnClick(event);
            setShowMenu(true);
          }}
        >
          ⋮
        </button>
      </div>
      <Menu
        id={props.name}
        open={showMenu()}
        options={menuOptions}
        onClose={handleMenuClose}
        x={menuCoordinates()?.x}
        y={menuCoordinates()?.y}
      />
    </>
  );
}
