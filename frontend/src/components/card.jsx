import { handleKeyDown } from "../utils";

export function Card(props) {
  return (
    <div
      id={`card-${props.name}`}
      class={`card ${props.isBeingDraggedOver ? "dragged-over" : ""}`}
      onKeyDown={e => handleKeyDown(e, props.onClick)}
      tabIndex="0"
    >
      <div class="card__toolbar">
        {props.headerSlot}
      </div>
      <div class="tags">
        <For each={props.tags}>
          {(tag) => (
            <div
              class="tag"
              style={{
                "background-color": tag.backgroundColor,
                "border-color": tag.backgroundColor,
              }}
            >
              <h5>{tag.name}</h5>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
