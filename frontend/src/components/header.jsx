import { createEffect, createMemo, createSignal, onMount } from "solid-js";

/**
 *
 * @param {Object} props
 * @param {string} props.sort
 * @param {string} props.search
 * @param {string} props.filteredTag
 * @param {string[]} props.tagOptions
 * @param {Function} props.onSearchChange
 * @param {Function} props.onTagChange
 * @param {Function} props.onNewLanBtnClick
 * @param {Function} props.viewMode
 * @param {Function} props.onViewModeChange
 */
export function Header(props) {
  const filterSelect = createMemo(() => {
    if (!props.tagOptions.length) {
      return null;
    }
    return (
      <>
        <div class="app-header__group-item-label">Filter by tag:</div>
        <select
          onChange={props.onTagChange}
          value={props.filteredTag || "none"}
        >
          <option value="none">None</option>
          <For each={props.tagOptions}>
            {(tag) => <option value={tag}>{tag}</option>}
          </For>
        </select>
      </>
    );
  });

  return (
    <header class="app-header">
      <input
        placeholder="Search"
        type="text"
        onInput={(e) => props.onSearchChange(e.target.value)}
        class="search-input"
      />
      <div class="app-header__group-item">
        <div class="app-header__group-item-label">Sort by:</div>
        <select onChange={props.onSortChange} value={props.sort}>
          <option value="none">Manually</option>
          <option value="name:asc">Name asc</option>
          <option value="name:desc">Name desc</option>
          <option value="tags:asc">Tags asc</option>
          <option value="tags:desc">Tags desc</option>
          <option value="due:asc">Due date asc</option>
          <option value="due:desc">Due date desc</option>
          <option value="lastUpdated:desc">Last updated</option>
          <option value="createdFirst:asc">Created first</option>
        </select>
      </div>
      <div class="app-header__group-item">
        {filterSelect()}
      </div>
      <div class="app-header__group-item">
        <div class="app-header__group-item-label">View mode:</div>
        <select onChange={props.onViewModeChange} value={props.viewMode}>
          <option value="extended">Extended</option>
          <option value="regular">Regular</option>
          <option value="compact">Compact</option>
          <option value="tight">Tight</option>
        </select>
      </div>
      <button type="button" onClick={props.onNewLaneBtnClick}>
        New lane
      </button>
    </header>
  );
}
