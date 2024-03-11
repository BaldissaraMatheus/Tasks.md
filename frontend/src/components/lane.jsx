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
 * @param {boolean} props.disableCardsDrag
 * @param {Function} props.onCardsSortChange
 * @param {JSX.Element} props.headerSlot
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
        filter: 'button'
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
