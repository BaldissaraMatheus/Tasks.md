import SimpleMDE from 'simplemde/dist/simplemde.min.js'
import 'simplemde/dist/simplemde.min.css'
import { createEffect, createSignal, onMount } from 'solid-js';
import { api } from '../api'

/**
 * 
 * @param {Object} props 
 * @param {string} props.name Card name
 * @param {string} props.content Initial card content
 * @param {string[]} props.tags Card tags
 * @param {string[]} props.allTags List of all available tags
 * @param {Function} props.onExit Callback function for when user clicks outside of the modal 
 * @param {Function} props.onContentChange Callback function for when the content of the card is changed
 * @param {Function} props.onNameChange Callback function for when the name of the card is changed
 * @param {Function} props.onTagClick Callback function for when a tag is clicked
 * @param {Function} props.validateFn Callback function to validate new card name
 */
function ExpandedCard(props) {
  const [simplemde, setSimplemde] = createSignal(null);
  const [isCreatingNewTag, setIsCreatingNewTag] = createSignal(null);
  const [availableTags, setAvailableTags] = createSignal([]);
  const [tagInputValue, setTagInputValue] = createSignal(null);
  const [nameInputValue, setNameInputValue] = createSignal(null);
  const [nameInputError, setNameInputError] = createSignal(null);

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

    if (props.tags?.includes(tagInputValue())) {
      setTagInputValue(null);
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
    const concatenatedTags = `${tagsSubstring}${tagsSubstring.length === 0 ? '' : ','} ${tagInputValue()}`;
    const newContent = actualContent.substring(0, tagsIndex)
      + concatenatedTags
      + actualContent.substring(tagsIndex + tagsSubstring.length, actualContent.length);
    simplemde().value(newContent);
    setTagInputValue(null);
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
      props.onContentChange(newSimpleMde.value());
    });
    setSimplemde(newSimpleMde);
  });

  createEffect(() => {
    if (isCreatingNewTag()) {
      return;
    }
    if (!isCreatingNewTag() && tagInputValue()) {
      return;
    }
    setIsCreatingNewTag(false);
    setTagInputValue(null);
  });

  createEffect(() => {
    setAvailableTags(props.allTags.filter(tag => tag.toLowerCase().includes(tagInputValue()?.toLowerCase())));
  });

  function handleOnNameInputChange(e) {
    setNameInputValue(e.target.value);
    const newNameWihtoutSpaces = e.target.value.trim();
    const isSameName = newNameWihtoutSpaces === props.name;
    if (isSameName && (!e.key || e?.key === 'Enter')) {
      return setNameInputValue(null);
    }
    if (isSameName) {
      return;
    }
    const error = props.validateFn(newNameWihtoutSpaces);
    setNameInputError(error);
    if (error) {
      return;
    }
    if (e.key && e.key !== 'Enter') {
      return;
    }
    fetch(`${api}/cards/${props.name}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newNameWihtoutSpaces })
    });
    props.onNameChange(newNameWihtoutSpaces);
    setNameInputValue(null);
  }

  function startRenamingCard() {
    setNameInputValue(props.name);
    document.getElementById(`name-input`).focus();
  }

	return (
    <div className="modal-bg" onClick={props.onExit}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal__toolbar">
          {
            nameInputValue() !== null
            ? <div class="input-and-error-msg">
              <input
                  type="text"
                  id="name-input"
                  class="modal__toolbar-name-input"
                  value={nameInputValue()}
                  onFocusOut={handleOnNameInputChange}
                  onKeyUp={handleOnNameInputChange}
                />
                { nameInputError()
                  ? <span class="error-msg">{ nameInputError() }</span>
                  : <></>
                }
              </div>
              : <h1 class="modal__toolbar-name" onClick={startRenamingCard} title="Click to rename card">
                {props.name || 'NO NAME'}
              </h1>
          }
          <button class="modal__toolbar-close-btn" onClick={props.onExit}>X</button>
        </div>
        <div className="modal__tags">
          {
            isCreatingNewTag()
              ? <>
                <input
                  type="text"
                  value={tagInputValue()}
                  onInput={e => setTagInputValue(e.target.value)}
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