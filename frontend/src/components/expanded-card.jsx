import {
  createEffect,
  createSignal,
  onMount,
  createMemo,
  onCleanup,
} from "solid-js";
import { api } from "../api";
import { Menu } from "./menu";
import { handleKeyDown, clickOutside } from "../utils";
import { makePersisted } from "@solid-primitives/storage";
import { NameInput } from "./name-input";
import { Portal } from "solid-js/web";
import { StacksEditor } from './Stacks-Editor/src/stacks-editor/editor'
import stacksStyle from './Stacks-Editor/node_modules/@stackoverflow/stacks/dist/css/stacks.css?inline'
import stacksEditorStyle from './Stacks-Editor/src/styles/index.css?inline'

/**
 *
 * @param {Object} props
 * @param {string} props.name Card name
 * @param {string} props.content Initial card content
 * @param {boolean} props.disableImageUpload Disable local image upload button
 * @param {string[]} props.tags Card tags
 * @param {string[]} props.tagsOptions List of all available tags
 * @param {Function} props.onClose Callback function for when user clicks outside of the dialog
 * @param {Function} props.onContentChange Callback function for when the content of the card is changed
 * @param {Function} props.onTagColorChange Callback function for when the color of a tag is changed
 * @param {Function} props.onNameChange Callback function for when the name of the card is changed
 * @param {Function} props.getNameErrorMsg Callback function to validate new card name
 */
function ExpandedCard(props) {
  const [isCardBeingRenamed, setIsCardBeingRenamed] = createSignal(false);
  const [newCardName, setNewCardName] = createSignal(null);
  const [isCreatingNewTag, setIsCreatingNewTag] = createSignal(null);
  const [availableTags, setAvailableTags] = createSignal([]);
  const [newTagName, setNewTagName] = createSignal("");
  const [newTagNameError, setTagNameError] = createSignal(null);
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
  const [mode, setMode] = makePersisted(createSignal("Markdown mode"), {
    storage: localStorage,
    name: "lastEditorModeUsed",
  });

  let dialogRef;
  let backdropRef;
  let tagsInputRef;
  let editorContainerRef;

  function handleTagRenameChange(newValue) {
    setNewTagName(newValue);
    const taskAlreadyHasThisTag = props.tags.some(
      (tag) => tag.name.toLowerCase() === newTagName().toLowerCase()
    );
    setTagNameError(taskAlreadyHasThisTag ? "Task already has this tag" : null);
  }

  function handleTagRenameConfirm() {
    setIsCreatingNewTag(false);
    if (newTagNameError()) {
      return handleTagRenameCancel();
    }

    if (!newTagName()) {
      return setNewTagName("");
    }

    let actualContent = editor().content;
    let indexOfTagsKeyword = actualContent.toLowerCase().indexOf("tags: ");
    if (indexOfTagsKeyword === -1) {
      actualContent = `tags: \n${actualContent}`;
      indexOfTagsKeyword = 0;
    }
    const tagsIndex = indexOfTagsKeyword + "tags: ".length;
    let tagsSubstring = actualContent.substring(tagsIndex);
    const lineBreak = actualContent.indexOf("\n");
    if (lineBreak > 0) {
      tagsSubstring = tagsSubstring.split("\n")[0];
    }

    // Proceed to concatenate the new tag
    const concatenatedTags = `${tagsSubstring}${
      tagsSubstring.length === 0 ? "" : ","
    } ${newTagName()}`.trim();

    const newContent =
      actualContent.substring(0, tagsIndex) +
      concatenatedTags +
      actualContent.substring(
        tagsIndex + tagsSubstring.length,
        actualContent.length
      );

    props.onContentChange(newContent);
    editor().content = newContent;
    setNewTagName("");
  }

  function handleTagRenameCancel() {
    setIsCreatingNewTag(false);
    setNewTagName("");
    setTagNameError(null);
  }

  function handleAddTagBtnOnClick(event) {
    event.stopPropagation();
    setNewTagName("");
    setIsCreatingNewTag(true);
    tagsInputRef?.focus();
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
    const tagsIndex = indexOfTagsKeyword + "tags: ".length;
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

  function handleOnNameInputChange(value) {
    setNewCardName(value);
  }

  function handleCardRenameConfirm() {
    const newNameWihtoutSpaces = newCardName().trim();
    const isSameName = newNameWihtoutSpaces === props.name;
    if (isSameName) {
      return handleCardRenameCancel();
    }
    fetch(`${api}/cards/${props.name}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newNameWihtoutSpaces }),
    });
    props.onNameChange(newNameWihtoutSpaces);
    setNewCardName("");
    setIsCardBeingRenamed(false);
  }

  function handleCardRenameCancel() {
    setNewCardName("");
    setIsCardBeingRenamed(false);
  }

  function startRenamingCard() {
    setNewCardName(props.name);
    setIsCardBeingRenamed(true);
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

  function handleEditorOnChange(e) {
    setTimeout(() => props.onContentChange(editor()?.content), 0);
  }

  function getButtonCoordinates(event) {
    event.stopPropagation();
    const dialogCoordinates = dialogRef.getBoundingClientRect();
    const {
      x: dialogX,
      y: dialogY,
      height: dialogHeight,
      width: dialogWidth,
    } = dialogCoordinates;
    const btnCoordinates = event.currentTarget.getBoundingClientRect();
    let x = btnCoordinates.x;
    const menuWidth = 90;
    const offsetX =
      x + btnCoordinates.width + menuWidth > dialogWidth + dialogX
        ? -btnCoordinates.width - menuWidth
        : btnCoordinates.width;
    x += offsetX - dialogX;
    const y = btnCoordinates.y - dialogY;
    return { x, y };
  }

  function handleTagClick(event, tag) {
    event.stopPropagation();
    const buttonCoordinates = getButtonCoordinates(event);
    setMenuCoordinates(buttonCoordinates);
    setClickedTag(tag);
    setShowTagPopup(true);
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

  const tagOptionsLength = 7;
  const colorMenuOptions = new Array(tagOptionsLength)
    .fill(1)
    .map((option, i) => ({
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
          {
            label: "Change color",
            onClick: handleChangeColorOptionClick,
            popoverTarget: "tag-color-menu",
          },
          { label: "Delete tag", onClick: () => deleteTag(clickedTag()?.name) },
        ]
      : []
  );

  createEffect(() => {
    setAvailableTags(
      props.tagsOptions.filter(
        (tagOption) =>
          !props.tags.some((tag) => tag.name === tagOption.name) &&
          tagOption.name.toLowerCase().includes(newTagName()?.toLowerCase())
      )
    );
  });

  onMount(() => {
    const editorClasses = ["editor", "theme-system"];
    if (props.disableImageUpload) {
      editorClasses.push("disable-image-upload");
    }
    console.log(StacksEditor)
    const newEditor = new StacksEditor(
      editorContainerRef,
      props.content || "",
      {
        classList: ["theme-system"],
        targetClassList: editorClasses,
        editorHelpLink: "https://github.com/BaldissaraMatheus/Tasks.md/issues",
        imageUpload: { handler: uploadImage },
      }
    );
    setEditor(newEditor);
    const toolbarEndGroupNodes = [
      ...editorContainerRef.childNodes[0].childNodes[1].childNodes[0]
        .childNodes[1].childNodes[0].childNodes,
    ];
    const modeBtns = toolbarEndGroupNodes.filter((node) => node.title);
    setModeBtns(modeBtns);
  });

  function handleClickEditorMode(e) {
    setMode(e.currentTarget.title);
  }

  createEffect(() => {
    if (!editor || !dialogRef) {
      return;
    }
    dialogRef.show();
    for (const btn of modeBtns()) {
      btn.addEventListener("click", handleClickEditorMode);
    }
    const modeBtn = modeBtns().find(
      (node) => node.title === mode()
    );
    modeBtn.click();
    const editorTextArea = editorContainerRef.childNodes[0].childNodes[2];
    editorTextArea.focus();
  });

  onCleanup(() => {
    for (const btn of modeBtns()) {
      btn.removeEventListener("click", handleClickEditorMode);
    }
  });

  function closeDialogWhenBackdropIsClicked(e) {
    if (e.target === dialogRef) {
      props.onClose();
    }
  }

  function handleDialogCancel(e) {
    e?.preventDefault();
    if (newCardName() || isCreatingNewTag()) {
      setNameInputValue(null);
      setIsCreatingNewTag(false);
      return;
    }
    props.onClose();
  }

  function handleBackdropClick(e) {
    if (e.target === backdropRef) {
      handleDialogCancel();
    }
  }

  return (
    <Portal>
      <div
        class="dialog-backdrop"
        onClick={handleBackdropClick}
        onKeyDown={(e) =>
          handleKeyDown(e, (event) => handleBackdropClick(event))
        }
        ref={(el) => {
          backdropRef = el;
        }}
      >
        <dialog
          ref={(el) => {
            dialogRef = el;
          }}
          class={`${isMaximized() === "true" ? "dialog--maximized" : ""}`}
          onKeyDown={(e) =>
            handleKeyDown(e, (event) => event.stopPropagation())
          }
          onCancel={handleDialogCancel}
          // TODO Doesn't work rn because it can be triggered by clicking image upload confirm button. Try again when new editor is implemented
          // use:clickOutside={handleDialogCancel}
        >
          <div class="dialog__body">
            <header class="dialog__toolbar">
              <div class="dialog__toolbar-name">
                <h1>
                  {isCardBeingRenamed() ? (
                    <NameInput
                      value={newCardName()}
                      errorMsg={props.getNameErrorMsg(newCardName())}
                      onChange={(value) => handleOnNameInputChange(value)}
                      onConfirm={handleCardRenameConfirm}
                      onCancel={handleCardRenameCancel}
                    />
                  ) : (
                    <div
                      role="button"
                      onClick={startRenamingCard}
                      onKeyDown={(e) => handleKeyDown(e, startRenamingCard)}
                      title="Click to rename card"
                      tabIndex="0"
                    >
                      {props.name || "NO NAME"}
                    </div>
                  )}
                </h1>
              </div>
              <div class="dialog__toolbar-btns">
                <button
                  type="button"
                  class="dialog__toolbar-btn"
                  onClick={() =>
                    setIsMaximized(isMaximized() === "true" ? "false" : "true")
                  }
                >
                  <span
                    class="jam jam-qr-code"
                    style={{ "font-size": "1.5rem", "margin-top": "-2px" }}
                  />
                </button>
                <button
                  type="button"
                  class="dialog__toolbar-btn"
                  onClick={props.onClose}
                >
                  <span
                    class="jam jam-close"
                    style={{ "font-size": "2rem", "margin-top": "-2px" }}
                  />
                </button>
              </div>
            </header>
            <div class="dialog__tags">
              {isCreatingNewTag() ? (
                <NameInput
                  value={newTagName()}
                  errorMsg={newTagNameError()}
                  onChange={handleTagRenameChange}
                  onConfirm={handleTagRenameConfirm}
                  onCancel={handleTagRenameCancel}
                  list="tags"
                  datalist={
                    <datalist id="tags">
                      <For each={availableTags()}>
                        {(tag) => <option value={tag.name} />}
                      </For>
                    </datalist>
                  }
                />
              ) : (
                <button type="button" onClick={handleAddTagBtnOnClick}>
                  Add tag
                </button>
              )}
              <For each={props.tags || []}>
                {(tag) => (
                  <div
                    class="tag tag--clicable"
                    style={{
                      "background-color": tag.backgroundColor,
                      "border-color": tag.backgroundColor,
                    }}
                    role="button"
                    popoverTarget="tag-menu"
                    onClick={(e) => handleTagClick(e, tag)}
                    onKeyDown={(e) =>
                      handleKeyDown(e, () => handleTagClick(e, tag))
                    }
                    tabIndex={0}
                  >
                    <h5>{tag.name}</h5>
                  </div>
                )}
              </For>
            </div>
            <div class="dialog__content">
              <style>{stacksStyle}</style>
              <style>{stacksEditorStyle}</style>
              <div
                id="editor-container"
                autofocus
                ref={(el) => {
                  editorContainerRef = el;
                }}
                onKeyDown={handleEditorOnChange}
                onClick={handleEditorOnChange}
              />
            </div>
          </div>
          <Menu
            id="tag-menu"
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
            id="tag-color-menu"
            open={showColorPopup()}
            options={colorMenuOptions}
            onClose={() => {
              setShowColorPopup(null);
              setMenuCoordinates(null);
            }}
            x={menuCoordinates()?.x}
            y={menuCoordinates()?.y}
          />
        </dialog>
      </div>
    </Portal>
  );
}

export default ExpandedCard;
