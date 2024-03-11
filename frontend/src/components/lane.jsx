import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
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
  const [cardsSortableInstance, setCardsSortableInstance] = createSignal(null);

  onMount(() => {
    const el = document.getElementById(`lane-${props.name}-sortable-container`);
    if (!el) {
      return;
    }
    setCardsSortableInstance(
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
    if (cardsSortableInstance()) {
      cardsSortableInstance().destroy();
    }
  });

  createEffect(() => {
    if (!cardsSortableInstance()) {
      return;
    }
    cardsSortableInstance().options.disabled = props.disableCardsDrag;
  })

  return (
    <>
      <div
        id={`lane-${props.name}`}
        class="lane"
      >
        <header class="lane__header">{props.headerSlot}</header>
        <div
          id={`lane-${props.name}-sortable-container`}
          class="lane__content"
        >
          {props.children}
        </div>
      </div>
    </>
  );
}
