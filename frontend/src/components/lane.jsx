import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  For,
  createMemo,
} from "solid-js";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {Object[]} props.cards
 * @param {Function} props.onDragStart
 * @param {Function} props.onDragOver
 * @param {Function} props.onDragEnd
 * @param {Function} props.validateNewName Function that checks if the new typed name is valid; It should return true if it's valid and false if it's not
 * @param {boolean} props.isBeingDraggedOver
 * @param {boolean} props.onRename
 * @param {boolean} props.onDelete
 */
export function Lane(props) {
  return (
    <>
      <div
        class={`lane ${props.isBeingDraggedOver ? "dragged-over" : ""}`}
        onDragEnter={(e) => e.preventDefault()}
        onDragEnd={props.onDragEnd}
        onDragOver={props.onDragOver}
      >
        <header class="lane__header">{props.headerSlot}</header>
        <div class="lane__content">{props.children}</div>
      </div>
    </>
  );
}
