import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  For,
  createMemo,
} from "solid-js";

import Sortable from "sortablejs";
import { removeCursorDragging, setCursorDragging } from "../utils";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {Function} props.validateNewName Function that checks if the new typed name is valid; It should return true if it's valid and false if it's not
 * @param {boolean} props.isBeingDraggedOver
 * @param {boolean} props.onRename
 * @param {boolean} props.onDelete
 */
export function Lane(props) {
  const [sortable, setSortable] = createSignal(null);

  onMount(() => {
    const el = document.getElementById(`lane-${props.name}-sortable-container`);
    if (!el) {
      return;
    }
    setSortable(
      Sortable.create(el, {
        animation: 150,
        group: "tasks",
        fallbackOnBody: true,
        swapThreshold: 0.65,
        onEnd: props.onCardsSortChange,
        onChoose: setCursorDragging,
        onUnchoose: removeCursorDragging,
        delay: 250,
        delayOnTouchOnly: true,
        chosenClass: 'grabbed',
      })
    );
  });

  onCleanup(() => {
    if (sortable()) {
      sortable().destroy();
    }
  });

  createEffect(() => {
    if (!sortable()) {
      return;
    }
    sortable().options.disabled = props.disableCardsDrag;
  })

  return (
    <>
      <div
        // class={`lane ${props.isBeingDraggedOver ? "dragged-over" : ""}`}
        id={`lane-${props.name}`}
        class="lane"
      >
        <header class="lane__header">{props.headerSlot}</header>
        <div class="lane__content" id={`lane-${props.name}-sortable-container`}>
          {props.children}
        </div>
      </div>
    </>
  );
}
