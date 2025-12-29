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
import { StacksEditor } from "./Stacks-Editor/src/stacks-editor/editor";
import { IconClear, IconScreenFull, IconScreenNormal } from "@stackoverflow/stacks-icons/icons";
import stacksStyle from "@stackoverflow/stacks/dist/css/stacks.css?inline";
import stacksEditorStyle from "./Stacks-Editor/src/styles/index.css?inline";
import { addTagToContent, removeTagFromContent, setDueDateInContent, getDueDateFromContent } from "../card-content-utils";

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

  const dueDate = createMemo(() => {
    return getDueDateFromContent(props.content);
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

    const actualContent = editor().content;
    const newContent = addTagToContent(actualContent, newTagName());
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
    const currentContent = editor().content;
    const newContent = removeTagFromContent(currentContent, tagName);
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
    return fetch(`${api}/image`, {
      method: "POST",
      mode: "cors",
      body: formData,
    })
    .then((res) => res.text())
    .then((imageName) => {
      handleEditorOnChange();
      return `${api}/image/${imageName}`;
    })
  }

  function handleEditorOnChange(e) {
    // Prevent update when opening dialog
    if (
      e?.target.name?.includes("mode-toggle") ||
      e?.target.class?.includes("iconRichText") ||
      e?.target.title?.includes("mode")
    ) {
      return;
    }
    setTimeout(() => {
      if (editor()?.content == props.content) {
        return;
      }
      props.onContentChange(editor()?.content)
  }, 0);
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
    const mapTagToColor = {
      [tagName]: `var(--color-alt-${option + 1})`,
    };
    props.onTagColorChange(mapTagToColor)
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
            style={{ "background-color": `var(--color-alt-${i + 1})` }}
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
    const modeBtn = modeBtns().find((node) => node.title === mode());
    if (modeBtn) {
      modeBtn.click();
    }
    const editorTextArea = editorContainerRef.childNodes[0].childNodes[2];
    editorTextArea.focus();
  });

  onCleanup(() => {
    for (const btn of modeBtns()) {
      btn.removeEventListener("click", handleClickEditorMode);
    }
  });

  function handleDialogCancel(e) {
    if (e?.target?.type === 'file') {
      return;
    }
    e?.preventDefault();
    if (newCardName() || isCreatingNewTag()) {
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

  function handleDialogKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleDialogCancel();
    }
  }

  function handleChangeDueDate(e) {
    const newContent = setDueDateInContent(props.content, e.target.value);
    editor().content = newContent;
    props.onContentChange(newContent);
  }

  return (
    <Portal>
      <div
        class="dialog-backdrop"
        onPointerDown={handleBackdropClick}
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
          onKeyDown={handleDialogKeyDown}
          onCancel={handleDialogCancel}
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
                  title={isMaximized() === "true" ? 'Minimize card' : 'Expand card'}
                  onClick={() =>
                    setIsMaximized(isMaximized() === "true" ? "false" : "true")
                  }
                >
                  <span innerHTML={isMaximized() === 'true' ? IconScreenNormal : IconScreenFull} />
                </button>
                <button
                  type="button"
                  class="dialog__toolbar-btn"
                  onClick={props.onClose}
                  title="Close"
                >
                  <span innerHTML={IconClear} />
                </button>
              </div>
            </header>
            <div class="dialog__tags-and-due-date">
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
                      class="tag tag--clickable"
                      style={{
                        "background-color": tag.backgroundColor,
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
              <div class="dialog__due-date">
                <label for="due">Due date: </label>
                <input
                  name="due"
                  type="date"
                  value={dueDate()}
                  onChange={handleChangeDueDate}
                ></input>
              </div>
            </div>
            <div class="dialog__content">
              <style>{stacksEditorStyle}</style>
              <style>{stacksStyle}</style>
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
