import { handleKeyDown } from "../utils";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {boolean} props.disableDrag
 * @param {Object[]} props.tags
 * @param {Function} props.onClick
 * @param {JSX.Element} props.headerSlot
 */
export function Card(props) {
  return (
    <div
      id={`card-${props.name}`}
      class={`card ${props.disableDrag ? 'card__drag-disabled' : ''}`}
      onKeyDown={e => handleKeyDown(e, props.onClick)}
      onClick={props.onClick}
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
