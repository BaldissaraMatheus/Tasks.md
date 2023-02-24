import SimpleMDE from 'simplemde/dist/simplemde.min.js'
import 'simplemde/dist/simplemde.min.css'
import { onMount } from 'solid-js';

/**
 * 
 * @param {Object} props 
 * @param {Function} props.title Card title
 * @param {Function} props.content Initial card content
 * @param {Function} props.tags Card tags
 * @param {Function} props.onExit Callback function for when user clicks outside of the modal 
 * @param {Function} props.onChange Callback function for when the content of the card is changed
 * @param {Function} props.onTagClick Callback function for when a tag is clicked
 */
function ExpandedCard(props) {
  onMount(() => {
    const simplemde = new SimpleMDE({
      spellChecker: false,
    });
    simplemde.value(props.content)
    simplemde.codemirror.on('change', () => {
      props.onChange(simplemde.value())
    })
  });

	return (
    <div className="modal-bg" onClick={props.onExit}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal__toolbar">
          <h1>{props.title || 'NO TITLE'}</h1>
          <button onClick={props.onExit}>X</button>
        </div>
        <div className="modal__tags">
          <For each={props.tags}>
            {tag => (
              <div className="tag">
                <h4>{tag}</h4>
              </div>
            )}
          </For>
        </div>
        <div className="modal__content">
          <textarea id="editor" />
        </div>
      </div>
    </div>
	)
}

export default ExpandedCard;