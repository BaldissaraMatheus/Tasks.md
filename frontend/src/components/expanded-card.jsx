import {
  createEffect,
  createSignal,
  onMount,
  createMemo,
  onCleanup,
} from "solid-js";
import { api } from "../api";
import { StacksEditor } from "@stackoverflow/stacks-editor";
import "@stackoverflow/stacks-editor/dist/styles.css";
import "@stackoverflow/stacks";
import "@stackoverflow/stacks/dist/css/stacks.css";
import { Menu } from "./menu";
import { getButtonCoordinates, handleKeyDown } from "../utils";
import { makePersisted } from "@solid-primitives/storage";
import { AiOutlineExpand } from "solid-icons/ai";
import { IoClose } from "solid-icons/io";

/**
 *
 * @param {Object} props
 * @param {string} props.name Card name
 * @param {string} props.content Initial card content
 * @param {boolean} props.disableImageUpload Disable local image upload button
 * @param {string[]} props.tags Card tags
 * @param {string[]} props.tagsOptions List of all available tags
 * @param {Function} props.onClose Callback function for when user clicks outside of the modal
 * @param {Function} props.onContentChange Callback function for when the content of the card is changed
 * @param {Function} props.onTagColorChange Callback function for when the color of a tag is changed
 * @param {Function} props.onNameChange Callback function for when the name of the card is changed
 * @param {Function} props.getErrorMsg Callback function to validate new card name
 */
function ExpandedCard(props) {
  const [isCreatingNewTag, setIsCreatingNewTag] = createSignal(null);
  const [availableTags, setAvailableTags] = createSignal([]);
  const [tagInputValue, setTagInputValue] = createSignal(null);
  const [nameInputValue, setNameInputValue] = createSignal(null);
  const [nameInputError, setNameInputError] = createSignal(null);
  const [editor, setEditor] = createSignal(null);
  const [menuCoordinates, setMenuCoordinates] = createSignal(null);
  const [clickedTag, setClickedTag] = createSignal(null);
  const [showTagPopup, setShowTagPopup] = createSignal(false);
  const [showColorPopup, setShowColorPopup] = createSignal(false);
  const [isMaximized, setIsMaximized] = makePersisted(createSignal("false"), {
    storage: localStorage,
    name: "isExpandedCardMaximized",
  });
  const [modeBtns, setModeBtns] = createSignal([]);
  const [lastEditorModeUsed, setLastEditorModeUsed] = makePersisted(
    createSignal("Markdown mode"),
    {
      storage: localStorage,
      name: "lastEditorModeUsed",
    }
  );

  function focusOutOnEnter(e) {
    if (e.key === "Enter") {
      document?.activeElement.blur();
    }
  }

  function handleTagInputFocusOut(e) {
    if (e && e.key && e.key !== "Enter") {
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
    let indexOfTagsKeyword = actualContent.toLowerCase().indexOf("tags: ");
    if (indexOfTagsKeyword === -1) {
      actualContent = `tags: \n${actualContent}`;
      indexOfTagsKeyword = 0;
    }
    let tagsIndex = indexOfTagsKeyword + "tags: ".length;
    let tagsSubstring = actualContent.substring(tagsIndex);
    const lineBreak = actualContent.indexOf("\n");
    if (lineBreak > 0) {
      tagsSubstring = tagsSubstring.split("\n")[0];
    }
    const concatenatedTags = `${tagsSubstring}${
      tagsSubstring.length === 0 ? "" : ","
    } ${tagInputValue()}`;
    const newContent =
      actualContent.substring(0, tagsIndex) +
      concatenatedTags +
      actualContent.substring(
        tagsIndex + tagsSubstring.length,
        actualContent.length
      );
    props.onContentChange(newContent);
    editor().content = newContent;
    setTagInputValue(null);
  }

  function handleAddTagBtnOnClick(event) {
    event.stopPropagation();
    setIsCreatingNewTag(true);
    document.getElementById("tags-input")?.focus();
  }

  function deleteTag(tagName) {
    setShowTagPopup(false);
    setMenuCoordinates(null);
    let currentContent = editor().content;
    let indexOfTagsKeyword = currentContent.toLowerCase().indexOf("tags: ");
    if (indexOfTagsKeyword === -1) {
      currentContent = `tags: \n${currentContent}`;
      indexOfTagsKeyword = 0;
    }
    let tagsIndex = indexOfTagsKeyword + "tags: ".length;
    let tagsSubstring = currentContent.substring(tagsIndex);
    const lineBreak = currentContent.indexOf("\n");
    if (lineBreak > 0) {
      tagsSubstring = tagsSubstring.split("\n")[0];
    }

    const newTags = tagsSubstring
      .split(", ")
      .map((newTag) => newTag.trim())
      .filter((newTag) => newTag !== tagName);
    const newTagsSubstring = newTags.join(", ");
    const endPart = currentContent.substring(
      tagsIndex + tagsSubstring.length,
      currentContent.length
    );
    const newContent = newTags.length
      ? currentContent.substring(0, tagsIndex) + newTagsSubstring + endPart
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
    if (isSameName && (!e.key || e?.key === "Enter")) {
      return setNameInputValue(null);
    }
    if (isSameName) {
      return;
    }
    const error = props.getErrorMsg(newNameWihtoutSpaces);
    setNameInputError(error);
    if (error) {
      return;
    }
    if (e.key && e.key !== "Enter") {
      return;
    }
    fetch(`${api}/cards/${props.name}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newNameWihtoutSpaces }),
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
    formData.set("file", file);
    return fetch(`${api}/images`, {
      method: "POST",
      mode: "cors",
      body: formData,
    }).then((res) => {
      handleEditorOnChange();
      return `${api}/images/${file.name}`;
    });
  }

  function handleEditorOnChange() {
    setTimeout(() => props.onContentChange(editor()?.content), 0);
  }

  function handleTagClick(event, tag, focus) {
    event.stopPropagation();
    const newCoordinates = getButtonCoordinates(event);
    setMenuCoordinates(newCoordinates);
    setClickedTag(tag);
    setShowTagPopup(true);
    if (focus) {
      setTimeout(() => {
        document.getElementById(clickedTag().name).firstChild.focus();
      }, 0);
    }
  }

  function handleChangeColorOptionClick() {
    setShowTagPopup(false);
    setShowColorPopup(true);
  }

  function handleColorOptionClick(option) {
    setShowColorPopup(null);
    setMenuCoordinates(null);
    const tagName = clickedTag().name;
    setClickedTag(null);
    fetch(`${api}/tags/${tagName}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        backgroundColor: `var(--tag-color-${option + 1})`,
      }),
    }).then((res) => props.onTagColorChange());
  }

  const colorMenuOptions = new Array(7).fill(1).map((option, i) => ({
    label: (
      <>
        Color {i + 1}{" "}
        <div
          class="color-preview-option"
          style={{ "background-color": `var(--tag-color-${i + 1})` }}
        />
      </>
    ),
    onClick: () => handleColorOptionClick(i),
  }));

  const tagMenuOptions = createMemo(() =>
    editor()
      ? [
          { label: "Change color", onClick: handleChangeColorOptionClick },
          { label: "Delete tag", onClick: () => deleteTag(clickedTag()?.name) },
        ]
      : []
  );

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
    setAvailableTags(
      props.tagsOptions.filter((tag) =>
        tag.name.toLowerCase().includes(tagInputValue()?.toLowerCase())
      )
    );
  });

  onMount(() => {
    const editorClasses = ["editor", "theme-system"];
    if (props.disableImageUpload) {
      editorClasses.push("disable-image-upload");
    }
    const editorEl = document.getElementById("editor-container");
    const newEditor = new StacksEditor(editorEl, props.content || "", {
      classList: ["theme-system"],
      targetClassList: editorClasses,
      editorHelpLink: "https://github.com/BaldissaraMatheus/Tasks.md/issues",
      imageUpload: { handler: uploadImage },
    });
    setEditor(newEditor);
    const toolbarEndGroupNodes = [
      ...editorEl.childNodes[0].childNodes[1].childNodes[0].childNodes[1]
        .childNodes[0].childNodes,
    ];
    const modeBtns = toolbarEndGroupNodes.filter((node) => node.title);
    setModeBtns(modeBtns);
  });

  function handleClickEditorMode(e) {
    setLastEditorModeUsed(e.currentTarget.title);
  }

  createEffect(() => {
    if (!editor) {
      return;
    }
    modeBtns().forEach((btn) =>
      btn.addEventListener("click", handleClickEditorMode)
    );
    const modeBtn = modeBtns().find(
      (node) => node.title === lastEditorModeUsed()
    );
    modeBtn.click();
    const editorTextArea =
      document.getElementById("editor-container").childNodes[0].childNodes[2];
    editorTextArea.focus();
  });

  onCleanup(() => {
    modeBtns().forEach((btn) =>
      btn.removeEventListener("click", handleClickEditorMode)
    );
  });

  return (
    <>
      <div
        class={`modal-bg ${
          isMaximized() === "true" ? "modal-bg--maximized" : ""
        }`}
        onClick={props.onClose}
      >
        <div
          class={`modal ${
            isMaximized() === "true" ? "modal--maximized" : ""
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div class="modal__toolbar">
            {nameInputValue() !== null ? (
              <div class="input-and-error-msg">
                <input
                  type="text"
                  id="name-input"
                  class="modal__toolbar-name-input"
                  value={nameInputValue()}
                  onFocusOut={handleOnNameInputChange}
                  onKeyDown={handleOnNameInputChange}
                />
                {nameInputError() ? (
                  <span class="error-msg">{nameInputError()}</span>
                ) : (
                  <></>
                )}
              </div>
            ) : (
              <h1
                class="modal__toolbar-name"
                onClick={startRenamingCard}
                onKeyDown={(e) => handleKeyDown(e, startRenamingCard)}
                title="Click to rename card"
                tabIndex="0"
              >
                {props.name || "NO NAME"}
              </h1>
            )}
            <div class="modal__toolbar-btns">
              <button
                class="modal__toolbar-btn"
                onClick={() =>
                  setIsMaximized(isMaximized() === "true" ? "false" : "true")
                }
              >
                <AiOutlineExpand size="25px" />
              </button>
              <button class="modal__toolbar-btn" onClick={props.onClose}>
                <IoClose size="25px" />
              </button>
            </div>
          </div>
          <div class="modal__tags">
            {isCreatingNewTag() ? (
              <>
                <input
                  id="tags-input"
                  type="text"
                  value={tagInputValue()}
                  onInput={(e) => setTagInputValue(e.target.value)}
                  onFocusOut={handleTagInputFocusOut}
                  onKeyDown={focusOutOnEnter}
                  list="tags"
                />
                <datalist id="tags">
                  <For each={availableTags()}>
                    {(tag) => <option value={tag.name} />}
                  </For>
                </datalist>
              </>
            ) : (
              <button onClick={handleAddTagBtnOnClick}>Add tag</button>
            )}
            <For each={props.tags || []}>
              {(tag) => (
                <div
                  class="tag tag--clicable"
                  style={{
                    "background-color": tag.backgroundColor,
                    "border-color": tag.backgroundColor,
                  }}
                  onClick={(e) => handleTagClick(e, tag)}
                  onKeyDown={(e) =>
                    handleKeyDown(e, () => handleTagClick(e, tag, true))
                  }
                  tabIndex={0}
                >
                  <h5>{tag.name}</h5>
                </div>
              )}
            </For>
          </div>
          <div class="modal__content">
            <div
              id="editor-container"
              onKeyDown={handleEditorOnChange}
              onClick={handleEditorOnChange}
            />
          </div>
        </div>
      </div>
      <Menu
        id={clickedTag()?.name}
        open={showTagPopup()}
        options={tagMenuOptions()}
        onClose={() => {
          setShowTagPopup(null);
          setMenuCoordinates(null);
        }}
        x={menuCoordinates()?.x}
        y={menuCoordinates()?.y}
      />
      <Menu
        id={clickedTag()?.name}
        open={showColorPopup()}
        options={colorMenuOptions}
        onClose={() => {
          setShowColorPopup(null);
          setMenuCoordinates(null);
          setClickedTag(null);
        }}
        x={menuCoordinates()?.x}
        y={menuCoordinates()?.y}
      />
    </>
  );
}

export default ExpandedCard;
