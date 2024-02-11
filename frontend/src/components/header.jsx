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
 */
export function Header(props) {
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
        </select>
      </div>
      <div class="app-header__group-item">
        <div class="app-header__group-item-label">Filter by tag:</div>
        <select onChange={props.onTagChange} value={props.filteredTag || 'none'}>
          <option value="none">None</option>
          <For each={props.tagOptions}>{(tag) => <option>{tag}</option>}</For>
        </select>
      </div>
      <button onClick={props.onNewLaneBtnClick}>New lane</button>
    </header>
  );
}
