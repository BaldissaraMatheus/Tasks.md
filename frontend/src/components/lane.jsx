import {
  createSortable,
  SortableProvider,
  useDragDropContext,
} from '@thisbeyond/solid-dnd';
/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {boolean} props.disableCardsDrag
 * @param {Function} props.onCardsSortChange
 * @param {JSX.Element} props.headerSlot
 */
export function Lane(props) {
  const sortable = createSortable(props.name, { type: "group" });
  const sortedItemIds = () => props.items.map((item) => item.id);

  return (
    <>
      <div
        id={`lane-${props.name}`}
        class="lane"
        ref={sortable.ref}
        style={maybeTransformStyle(sortable.transform)}
        classList={{ "opacity-25": sortable.isActiveDraggable }}
      >
        <header class="lane__header" {...sortable.dragActivators}>{props.headerSlot}</header>
        <div
          id={`lane-${props.name}-sortable-container`}
          class="lane__content"
        >
          <SortableProvider ids={sortedItemIds()}>
            {props.children}
          </SortableProvider>
        </div>
      </div>
    </>
  );
}
