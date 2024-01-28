import { createSignal } from "solid-js";
import { Menu } from "./menu";
import { getButtonCoordinates } from "../utils";

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

  function handleOptionBtnOnClick(event) {
    const coordinates = getButtonCoordinates(event);
    setMenuCoordinates(coordinates);
  }

  function handleMenuClose() {
    setShowMenu(false);
    setMenuCoordinates(null);
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
        <strong>{props.name}</strong>
        <div class="tag">
          <h5 class="counter">{props.count}</h5>
        </div>
      </div>
      <div class="lane__header-buttons">
        <button
          title="Create new card"
          class="small"
          onClick={() => props.onCreateNewCardBtnClick()}
        >
          +
        </button>
        <button
          title="Show lane options"
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
