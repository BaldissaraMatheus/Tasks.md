import { createSignal, For, Show, onMount, onCleanup, createMemo, createEffect } from 'solid-js';
import ExpandedCard from './components/expanded-card';

function App() {
  const [lanes, setLanes] = createSignal([])
  const [cards, setCards] = createSignal([
    {
      title: 'First Card',
      id: 1,
      content: '# A',
      laneId: 1,
      tags: ['testing', 'a', 'tag']
    },
    {
      title: 'Second Card',
      id: 2,
      content: '# B',
      laneId: 2,
      tags: []
    },
    {
      title: 'Third Card',
      id: 3,
      content: '# C',
      laneId: 2,
      tags: []
    },
  ]);
  const [sort, setSort] = createSignal(getDefaultFromLocalStorage('sort'))
  const [sortDirection, setSortDirection] = createSignal(getDefaultFromLocalStorage('sortDirection'))
  const [cardBeingDraggedId, setCardBeingDraggedId] = createSignal(null);
  const [cardToBeReplacedId, setCardToBeReplacedId] = createSignal(null);
  const [laneBeingDraggedId, setLaneBeingDraggedId] = createSignal(null);
  const [laneToBeReplacedId, setLaneToBeReplacedId] = createSignal(null);
  const [selectedCard, setSelectedCard] = createSignal(null);
  const [cardIdOptionsBeingShown, setCardIdOptionsBeingShown] = createSignal(null);
  const [laneIdOptionsBeingShown, setLaneIdOptionsBeingShown] = createSignal(null);
  const [popupCoordinates, setPopupCoordinates] = createSignal();
  const [search, setSearch] = createSignal('');
  const [laneBeingRenamed, setLaneBeingRenamed] = createSignal(null);
  const [newLaneName, setNewLaneName] = createSignal('');
  const [cardBeingRenamed, setCardBeingRenamed] = createSignal(null);
  const [newCardName, setNewCardName] = createSignal('');
  const [filteredTag, setFilteredTag] = createSignal(null)

  function getDefaultFromLocalStorage(key) {
    const defaultValue = localStorage.getItem(key);
    if (defaultValue === 'null') {
      return null;
    }
    return defaultValue;
  }

  function handleClickOutsideOptions(event) {
    if (
      cardIdOptionsBeingShown() !== null
      && event.target?.parentElement?.id !== `${cardIdOptionsBeingShown()}`
    ) {
      setCardIdOptionsBeingShown(null);
    }
    if (
      laneIdOptionsBeingShown() !== null
      && event.target?.parentElement?.id !== `${laneIdOptionsBeingShown()}`
    ) {
      setLaneIdOptionsBeingShown(null);
    }
  }

  onMount(() => {
    window.addEventListener('mousedown', handleClickOutsideOptions)
  });

  onCleanup(() => {
    window.removeEventListener('mousedown', handleClickOutsideOptions)
  });

  function moveCardPosition(event) {
    event.stopPropagation();
    const newCards = structuredClone(cards());
    const cardBeingDraggedIndex = newCards.findIndex(card => card.id === cardBeingDraggedId());
    const cardToBeReplacedIndex = newCards.findIndex(card => card.id === cardToBeReplacedId());

    const cardBeingDraggedLaneId = newCards[cardBeingDraggedIndex].laneId;
    const cardToBeReplacedLaneId = newCards[cardToBeReplacedIndex].laneId;
    newCards[cardBeingDraggedIndex].laneId = cardToBeReplacedLaneId;
    newCards[cardToBeReplacedIndex].laneId = cardBeingDraggedLaneId;

    const cardBeingDragged = newCards[cardBeingDraggedIndex];
    newCards[cardBeingDraggedIndex] = null;
    const upOrDownDisplacement = cardBeingDraggedIndex < cardToBeReplacedIndex
      ? 1
      : 0;
    const cardsWithChangedPositions = [
      ...newCards.slice(0, cardToBeReplacedIndex + upOrDownDisplacement),
      cardBeingDragged,
      ...newCards.slice(cardToBeReplacedIndex + upOrDownDisplacement)
    ]
    .filter(card => card !== null);
    setCards(cardsWithChangedPositions);
    setCardToBeReplacedId(null);
    setCardBeingDraggedId(null);
  }

  function moveCardToLane(newLaneId) {
    let newCards = structuredClone(cards());
    const cardBeingDraggedIndex = newCards.findIndex(card => card.id === cardBeingDraggedId());
    const newCard = structuredClone(newCards[cardBeingDraggedIndex]);
    if (newCard.laneId === newLaneId) {
      return;
    }
    newCard.laneId = newLaneId;
    newCards = newCards.filter((card, i) => i !== cardBeingDraggedIndex);
    newCards.push(newCard);
    setCards(newCards);
    setCardToBeReplacedId(null);
  }

  function changeCardContent(newContent, cardId) {
    const newCards = structuredClone(cards())
    const newCardIndex = structuredClone(newCards.findIndex(card => card.id === cardId))
    const newCard = newCards[newCardIndex];
    newCard.content = newContent;
    const newTags = getTags(newContent);
    newCard.tags = newTags;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setSelectedCard(newCard);
  }

  function getTags(text) {
    const indexOfTagsKeyword = text.toLowerCase().indexOf('tags: ');
    if (indexOfTagsKeyword === -1) {
      return null;
    }
    let startOfTags = text.substring(indexOfTagsKeyword + 'tags: '.length);
    const lineBreak = text.indexOf('\n');
    if (lineBreak > 0) {
      startOfTags = startOfTags.split('\n')[0];
    }
    const tags = startOfTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '')
      .sort((a, b) => a.localeCompare(b))
    return tags;
  }

  function handleOptionBtnOnClick(event) {
    event.stopPropagation();
    const x = event.target.offsetLeft;
    const y = event.target.offsetTop + 25;
    setPopupCoordinates({ x, y });
  }

  function deleteCard() {
    const newCards = structuredClone(cards());
    const cardsWithoutDeletedCard = newCards.filter(card => card.id !== cardIdOptionsBeingShown());
    setCards(cardsWithoutDeletedCard);
    setCardIdOptionsBeingShown(null);
  }

  function deleteLane() {
    const newLanes = structuredClone(lanes());
    const lanesWithoutDeletedCard = newLanes.filter(lane => lane.id !== laneIdOptionsBeingShown());
    setLanes(lanesWithoutDeletedCard);
    setLaneIdOptionsBeingShown(null);
  }

  const sortedCards = createMemo(() => {
    if (sortDirection() === null) {
      return cards();
    }
    if (sort() === 'name') {
      return sortCardsByName();
    }
    if (sort() === 'tags') {
      return sortCardsByTags();
    }
    return cards();
  });

  function sortCardsByName() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => sortDirection() === 'asc'
      ? a.title?.localeCompare(b.title)
      : b.title?.localeCompare(a.title)
    );
  }

  function sortCardsByTags() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return sortDirection() === 'asc'
        ? a.tags?.[0]?.localeCompare(b.tags?.[0])
        : b.tags?.[0]?.localeCompare(a.tags?.[0])
    });
  }

  function handleSortSelectOnChange(e) {
    const value = e.target.value;
    if (value === 'none') {
      setSort(null);
      return setSortDirection(null);
    }
    const [newSort, newSortDirection] = value.split(':');
    setSort(newSort);
    setSortDirection(newSortDirection);
  }

  const usedTags = createMemo(() => {
    const allTags = cards()
      .map(card => card.tags)
      .flat();
    const tagsWithoutDuplicates = Array.from(new Set(allTags));
    return tagsWithoutDuplicates;
  });

  function handleFilterSelectOnChange(e) {
    const value = e.target.value;
    if (value === 'none') {
      return setFilteredTag(null);
    }
    setFilteredTag(value);
  }

  function moveLanePosition(event) {
    event.stopPropagation();
    const newLanes = structuredClone(lanes());
    const laneBeingDraggedIndex = newLanes.findIndex(lane => lane.id === laneBeingDraggedId());
    const laneToBeReplacedIndex = newLanes.findIndex(lane => lane.id === laneToBeReplacedId());
    const upOrDownDisplacement = laneBeingDraggedIndex < laneToBeReplacedIndex
      ? 1
      : 0;
    const laneBeingDragged = newLanes[laneBeingDraggedIndex];
    newLanes[laneBeingDraggedIndex] = null;
    const lanesWithChangedPositions = [
      ...newLanes.slice(0, laneToBeReplacedIndex + upOrDownDisplacement),
      laneBeingDragged,
      ...newLanes.slice(laneToBeReplacedIndex + upOrDownDisplacement)
    ]
    .filter(lane => lane !== null);
    setLanes(lanesWithChangedPositions);
    setLaneToBeReplacedId(null);
    setLaneBeingDraggedId(null);
  }

  createEffect(() => {
    localStorage.setItem('sort', sort());
    localStorage.setItem('sortDirection', sortDirection());
  });

  createEffect(() => {
    const lanesFromApi = [
      { id: 1, name: 'Backlog' },
      { id: 2, name: 'Sprint' },
      { id: 3, name: 'Done' }
    ];
    const sortedLanesFromLocalStorage = localStorage.getItem('lanes');
    const sortedLanesFromLocalStorageArr = sortedLanesFromLocalStorage
      ? sortedLanesFromLocalStorage.split(',').map(id => Number.parseInt(id))
      : [];
    const sortedLanes = sortedLanesFromLocalStorageArr
      .filter(laneId => lanesFromApi.find(lane => lane.id === laneId))
      .map(laneId => lanesFromApi.find(laneFromApi => laneFromApi.id === laneId));
    const notSortedLanes = lanesFromApi.filter(lane => !sortedLanesFromLocalStorageArr.includes(lane.id));
    setLanes([...sortedLanes, ...notSortedLanes]);
  });

  createEffect(() => {
    localStorage.setItem('lanes', lanes().map(lane => lane.id));  
  });

  function startRenamingLane() {
    setLaneBeingRenamed(laneIdOptionsBeingShown());
    setNewLaneName(lanes().find(lane => lane.id === laneIdOptionsBeingShown()).name)
    document.getElementById(`${laneIdOptionsBeingShown()}-rename-input`).focus();
    setLaneIdOptionsBeingShown(null);
  }

  function renameLane(e) {
    if (e.key && e.key !== 'Enter') {
      return;
    }
    const newLanes = structuredClone(lanes());
    const newLaneIndex = newLanes.findIndex(lane => lane.id === laneBeingRenamed());
    const newLane = newLanes[newLaneIndex];
    newLane.name = newLaneName();
    newLanes[newLaneIndex] = newLane;
    setLanes(newLanes);
    setLaneBeingRenamed(null);
  }

  function startRenamingCard() {
    setCardBeingRenamed(cardIdOptionsBeingShown());
    setNewCardName(cards().find(card => card.id === cardIdOptionsBeingShown()).title)
    document.getElementById(`${cardIdOptionsBeingShown()}-rename-input`).focus();
    setCardIdOptionsBeingShown(null);
  }

  function renameCard(e) {
    if (e.key && e.key !== 'Enter') {
      return;
    }
    const newCards = structuredClone(cards());
    const newCardIndex = newCards.findIndex(card => card.id === cardBeingRenamed());
    const newCard = newCards[newCardIndex];
    newCard.title = newCardName();
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setCardBeingRenamed(null);
  }

  function createNewCard(laneId) {
    const newCards = structuredClone(cards());
    const maxId = Math.max(...newCards.map(card => card.id)) + 1;
    const newCard = { id: maxId, title: '', laneId }
    newCards.push(newCard);
    setCards(newCards);
  }

  function createNewLane() {
    const newLanes = structuredClone(lanes());
    const maxId = Math.max(...newLanes.map(lane => lane.id)) + 1;
    const newLane = { name: '', id: maxId };
    newLanes.push(newLane);
    setLanes(newLanes);
  }

  return (
    <>
      <header class="app-header">
        <input
          placeholder="Search"
          type="text"
          onInput={(e) => setSearch(e.target.value)}
        />
        <div class="app-header__group-item">
          <div class="app-header__group-item-label">Sort by:</div>
          <select
            onChange={handleSortSelectOnChange}
            value={sort() === null ? 'none' : `${sort()}:${sortDirection()}`}
          >
            <option value="none">Manually</option>
            <option value="name:asc">Name asc</option>
            <option value="name:desc">Name desc</option>
            <option value="tags:asc">Tags asc</option>
            <option value="tags:desc">Tags desc</option>
          </select>
        </div>
        <div class="app-header__group-item">
          <div class="app-header__group-item-label">Filter by:</div>
          <select
            onChange={handleFilterSelectOnChange}
            value={filteredTag() === null ? 'none' : filteredTag()}
          >
            <option value="none">None</option>
            <For each={usedTags()}>
              {tag => <option>{tag}</option>}
            </For>
          </select>
        </div>
        <button onClick={createNewLane}>New lane</button>
      </header>
      <main>
        <Show when={!!selectedCard()}>
          <ExpandedCard
            title={selectedCard().title}
            content={selectedCard().content}
            tags={selectedCard().tags}
            onExit={() => setSelectedCard(null)}
            onChange={(value) => changeCardContent(value, selectedCard().id)}
            onTagClick={(tagId) => removeTagFromCard(tagId)}
          />
        </Show>
        <For each={lanes()}>
          {(lane, i) => (
            <div
              class={`lane ${laneToBeReplacedId() === lane.id ? 'dragged-over' : ''}`}
              onDragEnd={(event) => moveLanePosition(event)}
              onDragOver={() => laneBeingDraggedId() ? setLaneToBeReplacedId(lane?.id) : null}
            >
              <header
                class="lane__header" 
                draggable={true}
                onDragStart={() => setLaneBeingDraggedId(lane.id)}
              >
                <div class="lane__header-name-and-count">
                  { laneBeingRenamed() === lane.id
                    ? <input
                      type="text"
                      id={`${lane.id}-rename-input`}
                      value={newLaneName()}
                      onInput={e => setNewLaneName(e.target.value)}
                      onFocusOut={renameLane}
                      onKeyUp={renameLane}
                    ></input>
                    : <strong>
                        {lane.name}
                      </strong>
                  }
                  <h5 class="tag">{sortedCards().filter(card => card.laneId === lane.id).length}</h5>
                </div>
                { laneBeingRenamed() === lane.id
                  ? <></>
                  : <div class="lane__header-buttons">
                    <button
                      title="Create new lane"
                      class="small"
                      onClick={() => createNewCard(lane.id)}
                    >
                      +
                    </button>
                    <button
                      title="Show lane options"
                      class="small"
                      onClick={event => {
                        handleOptionBtnOnClick(event, lane.id);
                        setLaneIdOptionsBeingShown(lane.id);
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                }
              </header>
              <div
                class="lane__content"
                onDragOver={() => cardBeingDraggedId() ? moveCardToLane(lane.id) : null}
              >
                <For
                  each={
                    sortedCards()
                      .filter(card => card.laneId === lane.id)
                      .filter(card => card.title.toLowerCase().includes(search().toLowerCase()))
                      .filter(card => filteredTag() === null || card.tags.includes(filteredTag()))
                  }
                >
                  {(card, j) => (
                    <>
                      <div
                        class={`
                          card
                          ${cardToBeReplacedId() === card.id ? 'dragged-over' : ''}
                          ${cardBeingRenamed() === card.id ? 'disabled' : ''}
                        `}
                        draggable={true}
                        onDragStart={() => setCardBeingDraggedId(card.id)}
                        onDragEnd={(event) => moveCardPosition(event)}
                        onDragOver={() => cardBeingDraggedId() ? setCardToBeReplacedId(card.id) : null}
                        onClick={() => setSelectedCard(card)}
                      >
                        <div class="card__toolbar">
                          { cardBeingRenamed() === card.id
                            ? <input
                              type="text"
                              id={`${card.id}-rename-input`}
                              value={newCardName()}
                              onInput={e => setNewCardName(e.target.value)}
                              onFocusOut={renameCard}
                              onKeyUp={renameCard}
                            ></input>
                            : <strong>
                              {card.title}
                            </strong>
                          }
                          { cardBeingRenamed() === card.id
                            ? <></>
                            : <button
                              title="Show card options"
                              class="small"
                              onClick={event => {
                                handleOptionBtnOnClick(event, card.id)
                                setCardIdOptionsBeingShown(card.id);
                              }}
                            >
                              ⋮
                            </button>
                          }
                        </div>
                        <div class="tags">
                          <For each={card.tags}>
                            {tag => (
                              <div class="tag">
                                <h4>{tag}</h4>
                              </div>
                            )}
                          </For>
                        </div>
                      </div>
                    </>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <Show when={cardIdOptionsBeingShown()}>
          <div
            id={cardIdOptionsBeingShown()}
            class="popup"
            style={{
              top:`${popupCoordinates().y}px`,
              left: `${popupCoordinates().x}px`
            }}
          >
            <button onClick={startRenamingCard}>Rename</button>
            <button onClick={deleteCard}>Delete</button>
          </div>
        </Show>
        <Show when={laneIdOptionsBeingShown()}>
          <div
            id={laneIdOptionsBeingShown()}
            class="popup"
            style={{
              top:`${popupCoordinates().y}px`,
              left: `${popupCoordinates().x}px`
            }}
          >
            <button onClick={startRenamingLane}>Rename</button>
            <button onClick={deleteLane}>Delete</button>
          </div>
        </Show>
      </main>
    </>
  );
}

export default App;
