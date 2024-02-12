import { createSignal } from "solid-js";
import { Menu } from "./menu";
import { getButtonCoordinates, handleKeyDown as handleKeyDown } from "../utils";
import { BiRegularDotsVerticalRounded } from "solid-icons/bi";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {boolean} props.hasContent
 * @param {Function} props.onRenameBtnClick
 * @param {Function} props.onDelete
 * @param {Function} props.onDragStart
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

  function handleClick(event, focus) {
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
      <div
        class="lane__header-name-and-count"
        draggable={true}
        onDragEnter={(e) => e.preventDefault()}
        onDragStart={props.onDragStart}
      >
        <strong>
          {props.hasContent ? "\uD83D\uDCDD " : ""}
          {props.name}
        </strong>
      </div>
      <div class="header-buttons">
        <button
          title="Show card options"
          class="small"
          onClick={handleClick}
          onKeyDown={(e) =>
            handleKeyDown(e, () => handleClick(e, true), handleCancel)
          }
        >
          <BiRegularDotsVerticalRounded />
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
