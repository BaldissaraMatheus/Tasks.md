import SimpleMDE from 'simplemde/dist/simplemde.min.js'
import 'simplemde/dist/simplemde.min.css'
import { createEffect, createSignal, onMount } from 'solid-js';

/**
 * 
 * @param {Object} props 
 * @param {string} props.title Card title
 * @param {string} props.content Initial card content
 * @param {string[]} props.tags Card tags
 * @param {string[]} props.allTags List of all available tags
 * @param {Function} props.onExit Callback function for when user clicks outside of the modal 
 * @param {Function} props.onChange Callback function for when the content of the card is changed
 * @param {Function} props.onTagClick Callback function for when a tag is clicked
 */
function ExpandedCard(props) {
  const [simplemde, setSimplemde] = createSignal(null);
  const [isCreatingNewTag, setIsCreatingNewTag] = createSignal(null);
  const [inputedTag, setInputedTag] = createSignal(null);
  const [availableTags, setAvailableTags] = createSignal([]);

  function focusOutOnEnter(e) {
    if (e.key === 'Enter') {
      document?.activeElement.blur();
    }
  }

  function leavesCreateTagInput(e) {
    if (e && e.key && e.key !== 'Enter') {
      return;
    }
    setIsCreatingNewTag(false);

    if (props.tags?.includes(inputedTag())) {
      setInputedTag(null);
      return;
    }

    let actualContent = simplemde().value();
    let indexOfTagsKeyword = actualContent.toLowerCase().indexOf('tags: ');
    if (indexOfTagsKeyword === -1) {
      actualContent = `tags: \n${actualContent}`;
      indexOfTagsKeyword = 0;
    }
    let tagsIndex = indexOfTagsKeyword + 'tags: '.length;
    let tagsSubstring = actualContent.substring(tagsIndex);
    const lineBreak = actualContent.indexOf('\n');
    if (lineBreak > 0) {
      tagsSubstring = tagsSubstring.split('\n')[0];
    }
    const concatenatedTags = `${tagsSubstring}${tagsSubstring.length === 0 ? '' : ','} ${inputedTag()}`;
    const newContent = actualContent.substring(0, tagsIndex)
      + concatenatedTags
      + actualContent.substring(tagsIndex + tagsSubstring.length, actualContent.length);
    simplemde().value(newContent);
    setInputedTag(null);
  }

  function handleAddTagBtnOnClick(event) {
    event.stopPropagation();
    setIsCreatingNewTag(true);
  }

  function removeTag(tag) {
    let actualContent = simplemde().value();
    let indexOfTagsKeyword = actualContent.toLowerCase().indexOf('tags: ');
    if (indexOfTagsKeyword === -1) {
      actualContent = `tags: \n${actualContent}`;
      indexOfTagsKeyword = 0;
    }
    let tagsIndex = indexOfTagsKeyword + 'tags: '.length;
    let tagsSubstring = actualContent.substring(tagsIndex);
    const lineBreak = actualContent.indexOf('\n');
    if (lineBreak > 0) {
      tagsSubstring = tagsSubstring.split('\n')[0];
    }

    const newTags = tagsSubstring
      .split(', ')
      .map(newTag => newTag.trim())
      .filter(newTag => newTag !== tag);
    const newTagsSubstring = newTags
      .join(', ');
    const endPart = actualContent.substring(tagsIndex + tagsSubstring.length, actualContent.length);
    const newContent = newTags.length
      ? actualContent.substring(0, tagsIndex)
        + newTagsSubstring
        + endPart
      : endPart;
    simplemde().value(newContent);
  }

  onMount(() => {
    const newSimpleMde = new SimpleMDE({
      spellChecker: false,
    });
    newSimpleMde.value(props.content)
    newSimpleMde.codemirror.on('change', () => {
      props.onChange(newSimpleMde.value());
    });
    setSimplemde(newSimpleMde);
  });

  createEffect(() => {
    if (isCreatingNewTag()) {
      return;
    }
    if (!isCreatingNewTag() && inputedTag()) {
      return;
    }
    setIsCreatingNewTag(false);
    setInputedTag(null);
  });

  createEffect(() => {
    setAvailableTags(props.allTags.filter(tag => tag.toLowerCase().includes(inputedTag()?.toLowerCase())));
  });

	return (
    <div className="modal-bg" onClick={props.onExit}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal__toolbar">
          <h1 class="modal__toolbar-title">{props.title || 'NO TITLE'}</h1>
          <button class="modal__toolbar-close-btn" onClick={props.onExit}>X</button>
        </div>
        <div className="modal__tags">
          {
            isCreatingNewTag()
              ? <>
                <input
                  type="text"
                  value={inputedTag()}
                  onInput={e => setInputedTag(e.target.value)}
                  
                  onFocusOut={leavesCreateTagInput}
                  onKeyUp={focusOutOnEnter}
                  list="tags"
                />
                <datalist id="tags">
                  <For each={availableTags()}>
                    {tag => <option value={tag} />}
                  </For>
                </datalist>
              </>
              : <button onClick={handleAddTagBtnOnClick}>Add tag</button>
          }
          <For each={props.tags || []}>
            {tag => (
              <div className="tag tag--clicable" onClick={() => removeTag(tag)}>
                <h5>{tag}</h5>
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