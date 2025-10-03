import { createSignal, Show, For, onMount, onCleanup, createEffect } from "solid-js";

/**
 * @param {Object} props
 * @param {number} props.selectedCount - Number of selected cards
 * @param {Function} props.onDelete - Callback for bulk delete
 * @param {Function} props.onAddTags - Callback for bulk add tags
 * @param {Function} props.onRemoveTags - Callback for bulk remove tags
 * @param {Function} props.onSetDueDate - Callback for bulk set due date
 * @param {Function} props.onClearSelection - Callback to clear selection
 * @param {string[]} props.tagsOptions - Available tag options (all tags in project)
 * @param {string[]} props.tagsOnSelectedCards - Tags that exist on selected cards
 */
export function BulkOperationsToolbar(props) {
  const [showTagMenu, setShowTagMenu] = createSignal(false);
  const [showRemoveTagMenu, setShowRemoveTagMenu] = createSignal(false);
  const [showDueDateInput, setShowDueDateInput] = createSignal(false);
  const [tagSearchQuery, setTagSearchQuery] = createSignal("");
  const [removeTagSearchQuery, setRemoveTagSearchQuery] = createSignal("");
  const [dueDate, setDueDate] = createSignal("");

  let dueDateRef;
  let tagSearchInputRef;
  let tagDropdownRef;
  let removeTagDropdownRef;
  let removeTagSearchInputRef;

  // Click outside to close tag dropdown
  onMount(() => {
    const handleClickOutside = (event) => {
      // Check if clicking on backdrop
      if (event.target.classList.contains('bulk-operations-toolbar__dropdown-backdrop')) {
        setShowTagMenu(false);
        setTagSearchQuery("");
        setShowRemoveTagMenu(false);
        setRemoveTagSearchQuery("");
        return;
      }
      
      if (tagDropdownRef && !tagDropdownRef.contains(event.target)) {
        setShowTagMenu(false);
        setTagSearchQuery("");
      }
      if (removeTagDropdownRef && !removeTagDropdownRef.contains(event.target)) {
        setShowRemoveTagMenu(false);
        setRemoveTagSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    onCleanup(() => {
      document.removeEventListener("mousedown", handleClickOutside);
    });
  });

  const filteredTags = () => {
    if (!props.tagsOptions) return [];
    if (!tagSearchQuery()) return props.tagsOptions;
    return props.tagsOptions.filter((tag) =>
      tag.toLowerCase().includes(tagSearchQuery().toLowerCase())
    );
  };

  const filteredRemoveTags = () => {
    if (!props.tagsOnSelectedCards) return [];
    if (!removeTagSearchQuery()) return props.tagsOnSelectedCards;
    return props.tagsOnSelectedCards.filter((tag) =>
      tag.toLowerCase().includes(removeTagSearchQuery().toLowerCase())
    );
  };

  const showCreateOption = () => {
    const query = tagSearchQuery().trim();
    if (!query) return false;
    // Show create option if the query doesn't exactly match any existing tag
    return !props.tagsOptions?.some(
      (tag) => tag.toLowerCase() === query.toLowerCase()
    );
  };

  function handleAddTag(tagName) {
    props.onAddTags(tagName);
    setTagSearchQuery("");
    setTimeout(() => tagSearchInputRef?.focus(), 0);
  }

  function handleCreateAndAddTag() {
    const tagName = tagSearchQuery().trim();
    if (tagName) {
      props.onAddTags(tagName);
      setTagSearchQuery("");
      setTimeout(() => tagSearchInputRef?.focus(), 0);
    }
  }

  function handleRemoveTag(tagName) {
    props.onRemoveTags(tagName);
    setRemoveTagSearchQuery("");
    setTimeout(() => removeTagSearchInputRef?.focus(), 0);
  }

  function handleSetDueDate() {
    if (dueDate()) {
      props.onSetDueDate(dueDate());
      setDueDate("");
      setShowDueDateInput(false);
    }
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${props.selectedCount} card${props.selectedCount !== 1 ? 's' : ''}? This action cannot be undone.`
    );
    if (confirmed) {
      props.onDelete();
    }
  }

  createEffect(() => {
    if (showRemoveTagMenu() && (!props.tagsOnSelectedCards || props.tagsOnSelectedCards.length === 0)) {
      setShowRemoveTagMenu(false);
      setRemoveTagSearchQuery("");
    }
  });

  return (
    <div class="bulk-operations-toolbar">
      <div class="bulk-operations-toolbar__content">
        <span class="bulk-operations-toolbar__count">
          {props.selectedCount} card{props.selectedCount !== 1 ? "s" : ""} selected
        </span>
        
        <button
          class="bulk-operations-toolbar__button"
          onClick={() => {
            const nextShowTagMenu = !showTagMenu();
            setShowTagMenu(nextShowTagMenu);
            if (nextShowTagMenu) {
              setShowRemoveTagMenu(false);
              setRemoveTagSearchQuery("");
              setShowDueDateInput(false);
              setDueDate("");
              setTimeout(() => tagSearchInputRef?.focus(), 0);
            } else {
              setTagSearchQuery("");
            }
          }}
        >
          Add Tags
        </button>

        <button
          class="bulk-operations-toolbar__button"
          onClick={() => {
            const nextShowRemoveTagMenu = !showRemoveTagMenu();
            setShowRemoveTagMenu(nextShowRemoveTagMenu);
            if (nextShowRemoveTagMenu) {
              setShowTagMenu(false);
              setTagSearchQuery("");
              setShowDueDateInput(false);
              setDueDate("");
              setTimeout(() => removeTagSearchInputRef?.focus(), 0);
            } else {
              setRemoveTagSearchQuery("");
            }
          }}
          disabled={!props.tagsOnSelectedCards || props.tagsOnSelectedCards.length === 0}
        >
          Remove Tags
        </button>

        <button
          class="bulk-operations-toolbar__button"
          onClick={() => {
            const nextShowDueDate = !showDueDateInput();
            setShowDueDateInput(nextShowDueDate);
            if (nextShowDueDate) {
              setShowTagMenu(false);
              setTagSearchQuery("");
              setShowRemoveTagMenu(false);
              setRemoveTagSearchQuery("");
              setTimeout(() => dueDateRef?.focus(), 0);
            } else {
              setDueDate("");
            }
          }}
        >
          Set Due Date
        </button>

        <button
          class="bulk-operations-toolbar__button bulk-operations-toolbar__button--danger"
          onClick={handleDelete}
        >
          Delete
        </button>

        <button
          class="bulk-operations-toolbar__button bulk-operations-toolbar__button--secondary"
          onClick={props.onClearSelection}
        >
          Clear Selection
        </button>
      </div>

      <Show when={showTagMenu()}>
        <div class="bulk-operations-toolbar__dropdown-backdrop" />
        <div class="bulk-operations-toolbar__dropdown" ref={tagDropdownRef}>
          <input
            type="text"
            class="bulk-operations-toolbar__search-input"
            placeholder="Search or create tag..."
            value={tagSearchQuery()}
            onInput={(e) => setTagSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCreateOption()) {
                handleCreateAndAddTag();
              } else if (e.key === "Escape") {
                setShowTagMenu(false);
                setTagSearchQuery("");
              }
            }}
            ref={tagSearchInputRef}
          />
          <div class="bulk-operations-toolbar__dropdown-list">
            <Show when={showCreateOption()}>
              <button
                class="bulk-operations-toolbar__dropdown-item bulk-operations-toolbar__dropdown-item--create"
                onClick={handleCreateAndAddTag}
              >
                <span class="bulk-operations-toolbar__create-icon">+</span>
                Create "{tagSearchQuery()}"
              </button>
            </Show>
            <For each={filteredTags()}>
              {(tag) => (
                <button
                  class="bulk-operations-toolbar__dropdown-item"
                  onClick={() => handleAddTag(tag)}
                >
                  {tag}
                </button>
              )}
            </For>
            <Show when={filteredTags().length === 0 && !showCreateOption()}>
              <div class="bulk-operations-toolbar__dropdown-empty">
                No tags found
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={showRemoveTagMenu()}>
        <div class="bulk-operations-toolbar__dropdown-backdrop" />
        <div class="bulk-operations-toolbar__dropdown" ref={removeTagDropdownRef}>
          <input
            type="text"
            class="bulk-operations-toolbar__search-input"
            placeholder="Search tags to remove..."
            value={removeTagSearchQuery()}
            onInput={(e) => setRemoveTagSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setShowRemoveTagMenu(false);
                setRemoveTagSearchQuery("");
              }
            }}
            ref={removeTagSearchInputRef}
          />
          <div class="bulk-operations-toolbar__dropdown-list">
            <For each={filteredRemoveTags()}>
              {(tag) => (
                <button
                  class="bulk-operations-toolbar__dropdown-item"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag}
                </button>
              )}
            </For>
            <Show when={filteredRemoveTags().length === 0}>
              <div class="bulk-operations-toolbar__dropdown-empty">
                No tags found
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Show when={showDueDateInput()}>
        <div class="bulk-operations-toolbar__dropdown-backdrop" />
        <div class="bulk-operations-toolbar__date-picker">
          <input
            type="date"
            class="bulk-operations-toolbar__date-input"
            value={dueDate()}
            onInput={(e) => setDueDate(e.target.value)}
            ref={dueDateRef}
          />
          <button
            class="bulk-operations-toolbar__button"
            onClick={handleSetDueDate}
          >
            Apply
          </button>
          <button
            class="bulk-operations-toolbar__button bulk-operations-toolbar__button--secondary"
            onClick={() => {
              setShowDueDateInput(false);
              setDueDate("");
            }}
          >
            Cancel
          </button>
        </div>
      </Show>
    </div>
  );
}
