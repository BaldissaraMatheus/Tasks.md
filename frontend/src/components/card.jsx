import { createMemo } from "solid-js";
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

  const dueDateStatusClass = createMemo(() => {
    if (!props.dueDate) {
      return '';
    }
    const [year, month, day] = props.dueDate.split('-')
    const dueDateLocalTime = new Date(year, month - 1, day);
    const dueDateLocalTimeISO = dueDateLocalTime.toISOString().split('T')[0];
    const todayISO = new Date().toISOString().split('T')[0];
    if (dueDateLocalTimeISO === todayISO) {
      return 'card__due-date--in-time';
    }
    if (dueDateLocalTimeISO < todayISO) {
      return 'card__due-date--past-time';
    }
    return '';
  });

  const dueDateFormatted = createMemo(() => {
    if (!props.dueDate) {
      return '';
    }
    const [year, month, day] = props.dueDate.split('-')
    const dueDateLocalTime = new Date(year, month - 1, day);
    return `Due ${dueDateLocalTime.toLocaleDateString()}` 
  })

  return (
    <div
      role="button"
      id={`card-${props.name}`}
      class={`card ${props.disableDrag ? "card__drag-disabled" : ""}`}
      onKeyDown={(e) => handleKeyDown(e, props.onClick)}
      onClick={e => {
        const isDescendant = e.currentTarget === e.target || e.currentTarget.contains(e.target);
        if (!isDescendant) {
          return;
        }
        props.onClick()
      }}
      tabIndex="0"
    >
      <div class="card__toolbar">{props.headerSlot}</div>
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
      <h5 class="card__content">{props.content}</h5>
      <h5 class={`card__due-date ${dueDateStatusClass()}`}>{dueDateFormatted()}</h5>
    </div>
  );
}
