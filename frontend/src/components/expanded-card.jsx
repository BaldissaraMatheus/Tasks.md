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
import {
	// getButtonCoordinates,
	handleKeyDown,
} from "../utils";
import { makePersisted } from "@solid-primitives/storage";
import { AiOutlineExpand } from "solid-icons/ai";
import { IoClose } from "solid-icons/io";
import { NameInput } from "./name-input";

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
	const [tagInputValue, setTagInputValue] = createSignal(null);
	const [tagInputError, setTagInputError] = createSignal(null);
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
		},
	);

	let dialogRef;
	let tagsInputRef;
	let editorContainerRef;

	function handleTagInputChange(newValue) {
		setTagInputValue(newValue);
		const taskAlreadyHasThisTag = props.tags.some(
			(tag) => tag.name.toLowerCase() === tagInputValue().toLowerCase(),
		);
		setTagInputError(
			taskAlreadyHasThisTag ? "Task already has this tag" : null,
		);
	}

	function focusOutOnEnter(e) {
		if (e.key === "Enter") {
			document?.activeElement.blur();
		}
	}

	function handleTagInputFocusOut(e) {
		if (e?.key && e.key !== "Enter") {
			return;
		}
		setIsCreatingNewTag(false);

		if (tagInputError()) {
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
		const tagsIndex = indexOfTagsKeyword + "tags: ".length;
		let tagsSubstring = actualContent.substring(tagsIndex);
		const lineBreak = actualContent.indexOf("\n");
		if (lineBreak > 0) {
			tagsSubstring = tagsSubstring.split("\n")[0];
		}

		// Proceed to concatenate the new tag
		const concatenatedTags = `${tagsSubstring}${
			tagsSubstring.length === 0 ? "" : ","
		} ${tagInputValue()}`.trim();

		const newContent =
			actualContent.substring(0, tagsIndex) +
			concatenatedTags +
			actualContent.substring(
				tagsIndex + tagsSubstring.length,
				actualContent.length,
			);

		props.onContentChange(newContent);
		editor().content = newContent;
		setTagInputValue(null);
	}

	function handleAddTagBtnOnClick(event) {
		event.stopPropagation();
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
			currentContent.length,
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
		setTagInputError(null);
	});

	function handleOnNameInputChange(value) {
		setNewCardName(value);
	}

	function handleRenameConfirm() {
		const newNameWihtoutSpaces = newCardName().trim();
		const isSameName = newNameWihtoutSpaces === props.name;
		if (isSameName) {
			return handleRenameCancel();
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

	function handleRenameCancel() {
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

	function handleEditorOnChange() {
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
			: [],
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
			props.tagsOptions.filter(
				(tagOption) =>
					!props.tags.some((tag) => tag.name === tagOption.name) &&
					tagOption.name.toLowerCase().includes(tagInputValue()?.toLowerCase()),
			),
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
			},
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
		setLastEditorModeUsed(e.currentTarget.title);
	}

	createEffect(() => {
		if (!editor || !dialogRef) {
			return;
		}
		dialogRef.showModal();
		for (const btn of modeBtns()) {
			btn.addEventListener("click", handleClickEditorMode);
		}
		const modeBtn = modeBtns().find(
			(node) => node.title === lastEditorModeUsed(),
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

	function closeDialogIfRootElementIsClicked(e) {
		if (e.target === dialogRef) {
			props.onClose();
		}
	}

	function handleDialogCancel(e) {
		e.preventDefault();
		if (newCardName() || isCreatingNewTag()) {
			setNameInputValue(null);
			setIsCreatingNewTag(false);
			return;
		}
		props.onClose();
	}

	return (
		<>
			<dialog
				ref={(el) => {
					dialogRef = el;
				}}
				class={`${isMaximized() === "true" ? "dialog--maximized" : ""}`}
				onmousedown={closeDialogIfRootElementIsClicked}
				onKeyDown={(e) => handleKeyDown(e, (event) => event.stopPropagation())}
				onCancel={handleDialogCancel}
			>
				<div class="dialog__body">
					<header class="dialog__toolbar">
						{isCardBeingRenamed() ? (
							<NameInput
								value={newCardName()}
								errorMsg={props.getNameErrorMsg(newCardName())}
								onChange={(value) => handleOnNameInputChange(value)}
								onConfirm={handleRenameConfirm}
								onCancel={handleRenameCancel}
							/>
						) : (
							<div
								role="button"
								class="dialog__toolbar-name"
								onClick={startRenamingCard}
								onKeyDown={(e) => handleKeyDown(e, startRenamingCard)}
								title="Click to rename card"
								tabIndex="0"
							>
								<h1>{props.name || "NO NAME"}</h1>
							</div>
						)}
						<div class="dialog__toolbar-btns">
							<button
								type="button"
								class="dialog__toolbar-btn"
								onClick={() =>
									setIsMaximized(isMaximized() === "true" ? "false" : "true")
								}
							>
								<AiOutlineExpand size="25px" />
							</button>
							<button
								type="button"
								class="dialog__toolbar-btn"
								onClick={props.onClose}
							>
								<IoClose size="25px" />
							</button>
						</div>
					</header>
					<div class="dialog__tags">
						{isCreatingNewTag() ? (
							<div class="input-and-error-msg">
								{/* TODO use nameInput component */}
								<input
									ref={(el) => {
										tagsInputRef = el;
									}}
									type="text"
									value={tagInputValue()}
									onInput={(e) => handleTagInputChange(e.target.value)}
									onFocusOut={handleTagInputFocusOut}
									onKeyDown={focusOutOnEnter}
									list="tags"
								/>
								<datalist id="tags">
									<For each={availableTags()}>
										{(tag) => <option value={tag.name} />}
									</For>
								</datalist>
								{tagInputError() ? (
									<span class="error-msg">{tagInputError()}</span>
								) : null}
							</div>
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
						<div
							id="editor-container"
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
		</>
	);
}

export default ExpandedCard;
