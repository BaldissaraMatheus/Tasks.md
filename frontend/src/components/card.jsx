import { handleKeyDown } from "../utils";

export function Card(props) {
  return (
    <div
      class={`card ${props.isBeingDraggedOver ? "dragged-over" : ""}`}
      draggable={true}
      onDragEnter={(e) => e.preventDefault()}
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDragEnd={props.onDragEnd}
      onClick={props.onClick}
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
