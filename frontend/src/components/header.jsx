import { createEffect, createMemo, createSignal, onMount, For } from "solid-js";

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
 * @param {boolean} props.selectionMode
 * @param {Function} props.onSelectionModeChange
 * @param {Function} props.t
 * @param {string} props.locale
 * @param {Function} props.onLocaleChange
 */
export function Header(props) {
  const filterSelect = createMemo(() => {
    if (!props.tagOptions.length) {
      return null;
    }
    return (
      <>
        <div class="app-header__group-item-label">{props.t()('header.filterByTag')}:</div>
        <select
          onChange={props.onTagChange}
          value={props.filteredTag || "none"}
        >
          <option value="none">{props.t()('header.filterNone')}</option>
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
        placeholder={props.t()('header.searchPlaceholder')}
        type="text"
        onInput={(e) => props.onSearchChange(e.target.value)}
        class="search-input"
      />
      <div class="app-header__group-item">
        <div class="app-header__group-item-label">{props.t()('header.sortBy')}:</div>
        <select onChange={props.onSortChange} value={props.sort}>
          <option value="none">{props.t()('header.sort.manually')}</option>
          <option value="name:asc">{props.t()('header.sort.nameAsc')}</option>
          <option value="name:desc">{props.t()('header.sort.nameDesc')}</option>
          <option value="tags:asc">{props.t()('header.sort.tagsAsc')}</option>
          <option value="tags:desc">{props.t()('header.sort.tagsDesc')}</option>
          <option value="due:asc">{props.t()('header.sort.dueAsc')}</option>
          <option value="due:desc">{props.t()('header.sort.dueDesc')}</option>
          <option value="lastUpdated:desc">{props.t()('header.sort.lastUpdated')}</option>
          <option value="createdFirst:asc">{props.t()('header.sort.createdFirst')}</option>
        </select>
      </div>
      <div class="app-header__group-item">
        {filterSelect()}
      </div>
      <div class="app-header__group-item">
        <div class="app-header__group-item-label">{props.t()('header.viewMode')}:</div>
        <select onChange={props.onViewModeChange} value={props.viewMode}>
          <option value="extended">{props.t()('header.view.extended')}</option>
          <option value="regular">{props.t()('header.view.regular')}</option>
          <option value="compact">{props.t()('header.view.compact')}</option>
          <option value="tight">{props.t()('header.view.tight')}</option>
        </select>
      </div>
      <button
        type="button"
        onClick={props.onNewLaneBtnClick}
        disabled={props.selectionMode}
      >
        {props.t()('header.newLane')}
      </button>
      <button
        type="button"
        onClick={() => props.onSelectionModeChange?.(!props.selectionMode)}
        class={props.selectionMode ? "button--active" : ""}
      >
        {props.selectionMode ? props.t()('header.exitSelection') : props.t()('header.selectCards')}
      </button>
      <div class="app-header__group-item">
        <div class="app-header__group-item-label">{props.t()('header.locale')}:</div>
        <select onChange={props.onLocaleChange} value={props.locale}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>
    </header>
  );
}
