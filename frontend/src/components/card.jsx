import { handleKeyDown } from "../utils";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {boolean} props.disableDrag
 * @param {Object[]} props.tags
 * @param {string} props.dueDate
 * @param {Function} props.onClick
 * @param {JSX.Element} props.headerSlot
 */
export function Card(props) {
  return (
    <div
      role="button"
      id={`card-${props.name}`}
      class={`card ${props.disableDrag ? "card__drag-disabled" : ""}`}
      onKeyDown={(e) => handleKeyDown(e, props.onClick)}
      onClick={props.onClick}
      tabIndex="0"
    >
      <div class="card__toolbar">{props.headerSlot}</div>
      <h5 class="card__content">{props.content}</h5>
      <ul class="card__tags">
        <For each={props.tags}>
          {(tag) => (
            <li
              class="tag"
              style={{
                "background-color": tag.backgroundColor,
                "border-color": tag.backgroundColor,
              }}
            >
              <h5>{tag.name}</h5>
            </li>
          )}
        </For>
      </ul>
      <h5 class="card__due-date">{props.dueDate ? `Due ${new Date(props.dueDate).toLocaleDateString()}` : ''}</h5>
    </div>
  );
}
