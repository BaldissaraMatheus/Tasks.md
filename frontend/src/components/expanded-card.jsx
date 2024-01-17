import { createEffect, createSignal, onMount, onCleanup } from 'solid-js';
import { api } from '../api'
import { StacksEditor } from "@stackoverflow/stacks-editor";
import "@stackoverflow/stacks-editor/dist/styles.css";
import "@stackoverflow/stacks";
import "@stackoverflow/stacks/dist/css/stacks.css";

/**
 * 
 * @param {Object} props 
 * @param {string} props.name Card name
 * @param {string} props.content Initial card content
 * @param {boolean} props.disableImageUpload Disable local image upload button
 * @param {string[]} props.tags Card tags
 * @param {string[]} props.tagsOptions List of all available tags
 * @param {Function} props.onExit Callback function for when user clicks outside of the modal 
 * @param {Function} props.onContentChange Callback function for when the content of the card is changed
 * @param {Function} props.onTagColorChange Callback function for when the color of a tag is changed
 * @param {Function} props.onNameChange Callback function for when the name of the card is changed
 * @param {Function} props.onTagClick Callback function for when a tag is clicked
 * @param {Function} props.validateFn Callback function to validate new card name
 */
function ExpandedCard(props) {
  const [isCreatingNewTag, setIsCreatingNewTag] = createSignal(null);
  const [availableTags, setAvailableTags] = createSignal([]);
  const [tagInputValue, setTagInputValue] = createSignal(null);
  const [nameInputValue, setNameInputValue] = createSignal(null);
  const [nameInputError, setNameInputError] = createSignal(null);
  const [editor, setEditor] = createSignal(null);
  const [popupCoordinates, setPopupCoordinates] = createSignal(null);
  const [clickedTag, setClickedTag] = createSignal(null);
  const [showTagPopup, setShowTagPopup] = createSignal(false);
  const [showColorPopup, setShowColorPopup] = createSignal(false);

  function focusOutOnEnter(e) {
    if (e.key === 'Enter') {
      document?.activeElement.blur();
    }
  }

  function handleTagInputFocusOut(e) {
    if (e && e.key && e.key !== 'Enter') {
      return;
    }
    setIsCreatingNewTag(false);

    if (props.tags?.includes(tagInputValue())) {
      return setTagInputValue(null);
    }

    if (!tagInputValue()) {
      return setTagInputValue(null);
    }

    let actualContent = editor().content;
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
    props.onContentChange(newContent);
    editor().content = newContent;
    setTagInputValue(null);
  }

  function handleAddTagBtnOnClick(event) {
    event.stopPropagation();
    setIsCreatingNewTag(true);
    document.getElementById('tags-input')?.focus();
  }

  function deleteTag(tagName) {
    setShowTagPopup(false);
    setPopupCoordinates(null);
    let currentContent = editor().content;
    let indexOfTagsKeyword = currentContent.toLowerCase().indexOf('tags: ');
    if (indexOfTagsKeyword === -1) {
      currentContent = `tags: \n${currentContent}`;
      indexOfTagsKeyword = 0;
    }
    let tagsIndex = indexOfTagsKeyword + 'tags: '.length;
    let tagsSubstring = currentContent.substring(tagsIndex);
    const lineBreak = currentContent.indexOf('\n');
    if (lineBreak > 0) {
      tagsSubstring = tagsSubstring.split('\n')[0];
    }

    const newTags = tagsSubstring
      .split(', ')
      .map(newTag => newTag.trim())
      .filter(newTag => newTag !== tagName);
    const newTagsSubstring = newTags
      .join(', ');
    const endPart = currentContent.substring(tagsIndex + tagsSubstring.length, currentContent.length);
    const newContent = newTags.length
      ? currentContent.substring(0, tagsIndex)
        + newTagsSubstring
        + endPart
      : endPart;
    editor().content = newContent;
    setClickedTag(null);
    props.onContentChange(newContent);
  }

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

  function uploadImage(file) {
    const formData = new FormData();
    formData.set('file', file);
    return fetch(`${api}/images`, {
      method: 'POST',
      mode: 'cors',
      body: formData
    })
    .then(res => {
      handleEditorOnChange();
      return `${api}/images/${file.name}`
    });
  }

  function handleEditorOnChange() {
    setTimeout(() => props.onContentChange(editor()?.content), 0)
  }

  function handleTagClick(event, tag) {
    event.stopPropagation();
    const btnCoordinates = event.target.getBoundingClientRect();
    let x = btnCoordinates.x + event.target.offsetWidth - 3;
    const menuWidth = 82;
    const offsetX = x + menuWidth >= window.innerWidth ? menuWidth : 0;
    x -= offsetX;
    const offsetY = offsetX ? 0 : 3;
    const y = btnCoordinates.y + event.target.offsetHeight - offsetY;
    setClickedTag(tag);
    setPopupCoordinates({ x, y });
    setShowTagPopup(true);
  }

  function handleClickOutsideOptions(event) {
    if (event.target?.parentElement?.id !== clickedTag()?.name) {
      setShowTagPopup(null);
      setShowColorPopup(null);
      setPopupCoordinates(null);
      setClickedTag(null);
    }
  }

  function handleChangeColorOptionClick() {
    setShowTagPopup(false);
    setShowColorPopup(true);
  }

  function handleColorOptionClick(option) {
    setShowColorPopup(null);
    setPopupCoordinates(null);
    const tagName = clickedTag().name;
    setClickedTag(null);
    fetch(`${api}/tags/${tagName}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backgroundColor: `var(--tag-color-${option + 1})` })
    })
    .then(res => props.onTagColorChange());
  }

  onMount(() => {
    const editorClasses = ['editor', 'theme-system'];
    if (props.disableImageUpload) {
      editorClasses.push('disable-image-upload');
    }
    const newEditor = new StacksEditor(
      document.getElementById('editor-container'),
      props.content || '',
      {
        classList: ['theme-system'],
        targetClassList: editorClasses,
        editorHelpLink: 'https://github.com/BaldissaraMatheus/Tasks.md/issues',
        imageUpload: { handler: uploadImage },
      },
    );
    setEditor(newEditor);
    window.addEventListener('mousedown', handleClickOutsideOptions);
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
    setAvailableTags(props.tagsOptions.filter(tag => tag.name.toLowerCase().includes(tagInputValue()?.toLowerCase())));
  });

  onCleanup(() => {
    window.removeEventListener('mousedown', handleClickOutsideOptions)
  });

	return (<>
    <div className="modal-bg" onClick={props.onExit}>
      <div className="modal" onClick={event => event.stopPropagation()}>
        <div className="modal__toolbar">
          {nameInputValue() !== null
            ? <div class="input-and-error-msg">
              <input
                type="text"
                id="name-input"
                class="modal__toolbar-name-input"
                value={nameInputValue()}
                onFocusOut={handleOnNameInputChange}
                onKeyUp={handleOnNameInputChange} />
              {nameInputError()
                ? <span class="error-msg">{nameInputError()}</span>
                : <></>}
            </div>
            : <h1 class="modal__toolbar-name" onClick={startRenamingCard} title="Click to rename card">
              {props.name || 'NO NAME'}
            </h1>}
          <button class="modal__toolbar-close-btn" onClick={props.onExit}>X</button>
        </div>
        <div className="modal__tags">
          {isCreatingNewTag()
            ? <>
              <input
                id="tags-input"
                type="text"
                value={tagInputValue()}
                onInput={e => setTagInputValue(e.target.value)}
                onFocusOut={handleTagInputFocusOut}
                onKeyUp={focusOutOnEnter}
                list="tags" />
              <datalist id="tags">
                <For each={availableTags()}>
                  {tag => <option value={tag.name} />}
                </For>
              </datalist>
            </>
            : <button onClick={handleAddTagBtnOnClick}>Add tag</button>}
          <For each={props.tags || []}>
            {tag => (
              <div
                className="tag tag--clicable"
                style={{ "background-color": tag.backgroundColor, "border-color": tag.backgroundColor }}
                onClick={e => handleTagClick(e, tag)}
              >
                <h5>{tag.name}</h5>
              </div>
            )}
          </For>
        </div>
        <div class="modal__content">
          <div
            id="editor-container"
            onKeyUp={handleEditorOnChange}
            onClick={handleEditorOnChange}
          >
          </div>
        </div>
      </div>
    </div>
    <Show when={showTagPopup()}>
      <div
        id={clickedTag().name}
        class="popup"
        style={{
          top: `${popupCoordinates().y}px`,
          left: `${popupCoordinates().x}px`,
        }}
      >
        <button onClick={handleChangeColorOptionClick}>Change color</button>
        <button onClick={() => deleteTag(clickedTag().name)}>Delete tag</button>
      </div>
    </Show>
    <Show when={showColorPopup()}>
      <div
        id={clickedTag().name}
        class="popup"
        style={{
          top: `${popupCoordinates().y}px`,
          left: `${popupCoordinates().x}px`,
        }}
      >
        {
          new Array(7).fill(1).map((option, i) => (
            <button onClick={() => handleColorOptionClick(i)}>Color {i + 1} <div
              class='color-preview-option'
              style={{ "background-color": `var(--tag-color-${i + 1})` }}
            />
            </button>
          ))
        }
      </div>
    </Show>
  </>
	)
}

export default ExpandedCard;