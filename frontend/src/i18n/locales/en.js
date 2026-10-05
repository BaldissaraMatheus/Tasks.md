export default {
	common: {
		confirm: "Confirm", cancel: "Cancel", card: "Card", lane: "Lane", noTagsFound: "No tags found", close: "Close",
	},
	header: {
		searchPlaceholder: "Search", filterByTag: "Filter by tag", filterNone: "No filter",
		sortBy: "Sort by",
		sort: { manually: "Manually", nameAsc: "Name (A-Z)", nameDesc: "Name (Z-A)", tagsAsc: "Tags (A-Z)", tagsDesc: "Tags (Z-A)", dueAsc: "Due {{date}}", dueDesc: "Due {{date}}", lastUpdated: "Last updated", createdFirst: "Created first" },
		viewMode: "View mode",
		view: { extended: "Extended", regular: "Regular", compact: "Compact", tight: "Tight" },
		newLane: "New lane", selectCards: "Select cards", exitSelection: "Exit selection", locale: "Language",
		showDone: "Done tasks", showActive: "Active tasks",
	},
	card: { due: "Due {{date}}", done: "Done {{date}}" },
	cardName: { done: "Mark done", undone: "Mark not done", rename: "Rename", delete: "Delete", showOptions: "Show options" },
	laneName: { rename: "Rename", deleteCard: "Delete card", deleteLane: "Delete lane", createCard: "Create card", showOptions: "Show options" },
	expandedCard: {
		addTag: "Add tag", changeColor: "Change color", deleteTag: "Delete tag", dueDate: "Due date",
		minimize: "Minimize", expand: "Expand", colorOption: "Color {{n}}", rename: "Click to rename",
		tagError: { duplicate: "Duplicate tag" },
		done: "Mark done", undone: "Mark not done",
	},
	bulk: {
		selected: "{{count}} card selected", selected_plural: "{{count}} cards selected",
		addTags: "Add tags", removeTags: "Remove tags", setDueDate: "Set due date", done: "Mark done", undone: "Mark not done", delete: "Delete", clearSelection: "Clear selection",
		tagSearchPlaceholder: "Search tags", removeTagPlaceholder: "Remove tag", createTag: 'Create "{{tag}}"',
		deleteConfirm: "Delete selected?", deleteConfirm_plural: "Delete selected?",
	},
	doneView: { title: "Done" },
	validation: {
		mustHaveName: "Name is required", hiddenByDot: "Hidden by dot", duplicateName: "Duplicate name",
		forbiddenChars: "Forbidden characters", noMdExtension: "No .md extension", prohibitedName: "Prohibited name",
	},
	keyboard: { title: "Keyboard Shortcuts", sections: { navigation: "Navigation", cardActions: "Card actions", general: "General" }, shortcuts: {} },
}
