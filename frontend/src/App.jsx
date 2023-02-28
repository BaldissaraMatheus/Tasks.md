import { createSignal, For, Show, onMount, onCleanup, createMemo, createEffect } from 'solid-js';
import ExpandedCard from './components/expanded-card';
import { scheduleIdle, debounce } from "@solid-primitives/scheduled";

function App() {
  const [lanes, setLanes] = createSignal([])
  const [cards, setCards] = createSignal([]);
  const [sort, setSort] = createSignal(getDefaultFromLocalStorage('sort'))
  const [sortDirection, setSortDirection] = createSignal(getDefaultFromLocalStorage('sortDirection'))
  const [cardBeingDraggedName, setCardBeingDraggedId] = createSignal(null);
  const [cardToBeReplacedId, setCardToBeReplacedId] = createSignal(null);
  const [laneBeingDraggedName, setLaneBeingDraggedId] = createSignal(null);
  const [laneToBeReplacedName, setLaneToBeReplacedId] = createSignal(null);
  const [selectedCard, setSelectedCard] = createSignal(null);
  const [cardOptionsBeingShown, setCardOptionsBeingShown] = createSignal(null);
  const [laneOptionsBeingShown, setlaneOptionsBeingShown] = createSignal(null);
  const [popupCoordinates, setPopupCoordinates] = createSignal();
  const [search, setSearch] = createSignal('');
  const [laneBeingRenamed, setLaneBeingRenamed] = createSignal(null);
  const [newLaneName, setNewLaneName] = createSignal('');
  const [cardBeingRenamed, setCardBeingRenamed] = createSignal(null);
  const [newCardName, setNewCardName] = createSignal('');
  const [filteredTag, setFilteredTag] = createSignal(null);

  const api = 'http://localhost:3001';

  onMount(async () => {
    const data = await fetch(`${api}/cards`, { method: 'GET', mode: 'cors' })
      .then(res => res.json())
      .then(cards => cards.map(card => ({ ...card, tags: getTags(card.content) })))
    setCards(data);
  });

  createEffect(async () => {
    const newLanes = await fetch(`${api}/lanes`, { method: 'GET', mode: 'cors' })
      .then(res => res.json())
      .then(lanes => lanes.map(lane => ({ name: lane })));

    if (newLanes.length <= lanes().length) {
      return;
    }
    const sortedLanesFromLocalStorage = localStorage.getItem('lanes')?.split(',') || [];
    const sortedLanes = sortedLanesFromLocalStorage
      .filter(sortedLane => newLanes.find(lane => lane.name === sortedLane))
      .map(lane => newLanes.find(laneFromApi => laneFromApi.name === lane));
    const notSortedLanes = newLanes.filter(lane => !sortedLanesFromLocalStorage.includes(lane.name));
    setLanes([...sortedLanes, ...notSortedLanes]);
  });

  function getDefaultFromLocalStorage(key) {
    const defaultValue = localStorage.getItem(key);
    if (defaultValue === 'null') {
      return null;
    }
    return defaultValue;
  }

  function handleClickOutsideOptions(event) {
    if (
      cardOptionsBeingShown() !== null
      && event.target?.parentElement?.id !== `${cardOptionsBeingShown()}`
    ) {
      setCardOptionsBeingShown(null);
    }
    if (
      laneOptionsBeingShown() !== null
      && event.target?.parentElement?.id !== `${laneOptionsBeingShown()}`
    ) {
      setlaneOptionsBeingShown(null);
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
    const cardBeingDraggedIndex = newCards.findIndex(card => card.name === cardBeingDraggedName());
    const cardToBeReplacedIndex = newCards.findIndex(card => card.name === cardToBeReplacedId());

    const cardBeingDraggedlane = newCards[cardBeingDraggedIndex].lane;
    const cardToBeReplacedlane = newCards[cardToBeReplacedIndex].lane;
    newCards[cardBeingDraggedIndex].lane = cardToBeReplacedlane;
    newCards[cardToBeReplacedIndex].lane = cardBeingDraggedlane;

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

  const debounceUpdateCardLaneReq = debounce((card) => {
    fetch(`${api}/lanes/${card.lane}/${card.name}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane: card.newLane })
    });
  }, 250);

  function moveCardToLane(newLane) {
    let newCards = structuredClone(cards());
    const cardBeingDraggedIndex = newCards.findIndex(card => card.name === cardBeingDraggedName());
    const newCard = structuredClone(newCards[cardBeingDraggedIndex]);
    if (newCard.lane === newLane) {
      return;
    }
    debounceUpdateCardLaneReq({ lane: newCard.lane, name: newCard.name, newLane: newLane });
    newCard.lane = newLane;
    newCards = newCards.filter((card, i) => i !== cardBeingDraggedIndex);
    newCards.push(newCard);
    setCards(newCards);
    setCardToBeReplacedId(null);
  }
  const debounceChangeCardContent = debounce((newContent) => changeCardContent(newContent), 250);

  function changeCardContent(newContent) {
    const newCards = structuredClone(cards())
    const newCardIndex = structuredClone(newCards.findIndex(card => card.name === selectedCard().name
      && card.lane === selectedCard().lane
    ))
    const newCard = newCards[newCardIndex];
    newCard.content = newContent;
    const newTags = getTags(newContent);
    newCard.tags = newTags;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setSelectedCard(newCard);
    fetch(`${api}/lanes/${newCard.lane}/${newCard.name}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent })
    });
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
    fetch(`${api}/lanes/${cardOptionsBeingShown().lane}/${cardOptionsBeingShown().name}`, { method: 'DELETE', mode: 'cors' })
    const cardsWithoutDeletedCard = newCards.filter(card => card.name !== cardOptionsBeingShown().name);
    setCards(cardsWithoutDeletedCard);
    setCardOptionsBeingShown(null);
  }

  function deleteLane() {
    const newLanes = structuredClone(lanes());
    fetch(`${api}/lanes/${laneOptionsBeingShown().name}`, { method: 'DELETE', mode: 'cors' })
    const lanesWithoutDeletedCard = newLanes.filter(lane => lane.name !== laneOptionsBeingShown().name);
    setLanes(lanesWithoutDeletedCard);
    setlaneOptionsBeingShown(null);
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
      ? a.name?.localeCompare(b.name)
      : b.name?.localeCompare(a.name)
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
    const laneBeingDraggedIndex = newLanes.findIndex(lane => lane.name === laneBeingDraggedName());
    const laneToBeReplacedIndex = newLanes.findIndex(lane => lane.name === laneToBeReplacedName());
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
    if (!lanes().length) {
      return;
    }
    localStorage.setItem('lanes', lanes().map(lane => lane.name));  
  });

  function startRenamingLane() {
    setLaneBeingRenamed(laneOptionsBeingShown());
    setNewLaneName(lanes().find(lane => lane.name === laneOptionsBeingShown().name).name)
    document.getElementById(`${laneOptionsBeingShown().name}-rename-input`).focus();
    setlaneOptionsBeingShown(null);
  }

  function renameLane(e) {
    if (e.key && e.key !== 'Enter') {
      return;
    }
    const newLanes = structuredClone(lanes());
    const newLaneIndex = newLanes.findIndex(lane => lane.name === laneBeingRenamed().name);
    const newLane = newLanes[newLaneIndex];
    fetch(`${api}/lanes/${newLane.name}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLaneName() })
    });
    newLane.name = newLaneName();
    newLanes[newLaneIndex] = newLane;
    setLanes(newLanes);
    setLaneBeingRenamed(null);
  }

  function startRenamingCard() {
    setCardBeingRenamed(cardOptionsBeingShown());
    setNewCardName(cards().find(card => card.name === cardOptionsBeingShown().name).name)
    document.getElementById(`${cardOptionsBeingShown().name}-rename-input`).focus();
    setCardOptionsBeingShown(null);
  }

  function renameCard(e) {
    if (e.key && e.key !== 'Enter') {
      return;
    }
    const newCards = structuredClone(cards());
    const newCardIndex = newCards.findIndex(card => card.name === cardBeingRenamed()?.name);
    const newCard = newCards[newCardIndex];
    fetch(`${api}/lanes/${newCard.lane}/${newCard.name}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCardName() })
    });
    newCard.name = newCardName();
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setCardBeingRenamed(null);
  }

  async function createNewCard(lane) {
    const newCards = structuredClone(cards());
    const newCard = { lane }
    const newCardName = await fetch(`${api}/cards`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane: newCard.lane })
    }).then(res => res.text());
    newCard.name = newCardName;
    newCards.push(newCard);
    setCards(newCards);
  }

  async function createNewLane() {
    const newLanes = structuredClone(lanes());
    const newLaneName = await fetch(`${api}/lanes`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
    }).then(res => res.text());
    newLanes.push({ name: newLaneName });
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
            title={selectedCard().name}
            content={selectedCard().content}
            tags={selectedCard().tags}
            onExit={() => setSelectedCard(null)}
            onChange={(value) => debounceChangeCardContent(value, selectedCard().id)}
            onTagClick={(tagId) => removeTagFromCard(tagId)}
          />
        </Show>
        <For each={lanes()}>
          {lane => (
            <div
              class={`lane ${laneToBeReplacedName() === lane.name ? 'dragged-over' : ''}`}
              onDragEnd={(event) => moveLanePosition(event)}
              onDragOver={() => laneBeingDraggedName() ? setLaneToBeReplacedId(lane?.name) : null}
            >
              <header
                class="lane__header" 
                draggable={true}
                onDragStart={() => setLaneBeingDraggedId(lane.name)}
              >
                <div class="lane__header-name-and-count">
                  { laneBeingRenamed()?.name === lane.name
                    ? <input
                      type="text"
                      id={`${lane.name}-rename-input`}
                      value={newLaneName()}
                      onInput={e => setNewLaneName(e.target.value)}
                      onFocusOut={renameLane}
                      onKeyUp={renameLane}
                    ></input>
                    : <strong>
                        {lane.name}
                      </strong>
                  }
                  <h5 class="tag counter">
                    {sortedCards().filter(card => card.lane === lane.name).length}
                  </h5>
                </div>
                { laneBeingRenamed()?.name === lane.name
                  ? <></>
                  : <div class="lane__header-buttons">
                    <button
                      title="Create new lane"
                      class="small"
                      onClick={() => createNewCard(lane.name)}
                    >
                      +
                    </button>
                    <button
                      title="Show lane options"
                      class="small"
                      onClick={event => {
                        handleOptionBtnOnClick(event);
                        setlaneOptionsBeingShown(lane);
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                }
              </header>
              <div
                class="lane__content"
                onDragOver={() => cardBeingDraggedName() ? moveCardToLane(lane.name) : null}
              >
                <For
                  each={
                    sortedCards()
                      .filter(card => card.lane === lane.name)
                      .filter(card => card.name.toLowerCase().includes(search().toLowerCase()))
                      .filter(card => filteredTag() === null || card.tags.includes(filteredTag()))
                  }
                >
                  {card => (
                    <>
                      <div
                        class={`
                          card
                          ${cardToBeReplacedId() === card.name ? 'dragged-over' : ''}
                          ${cardBeingRenamed()?.name === card.name ? 'disabled' : ''}
                        `}
                        draggable={true}
                        onDragStart={() => setCardBeingDraggedId(card.name)}
                        onDragEnd={(event) => moveCardPosition(event)}
                        onDragOver={() => cardBeingDraggedName() ? setCardToBeReplacedId(card.name) : null}
                        onClick={() => setSelectedCard(card)}
                      >
                        <div class="card__toolbar">
                          { cardBeingRenamed()?.name === card.name
                            ? <input
                              type="text"
                              id={`${card.name}-rename-input`}
                              value={newCardName()}
                              onInput={e => setNewCardName(e.target.value)}
                              onFocusOut={renameCard}
                              onKeyUp={renameCard}
                            ></input>
                            : <div>
                              {card.name}
                            </div>
                          }
                          { cardBeingRenamed()?.name === card.name
                            ? <></>
                            : <button
                              title="Show card options"
                              class="small"
                              onClick={event => {
                                handleOptionBtnOnClick(event)
                                setCardOptionsBeingShown(card);
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
                                <h5>{tag}</h5>
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
        <Show when={cardOptionsBeingShown()}>
          <div
            id={cardOptionsBeingShown()}
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
        <Show when={laneOptionsBeingShown()}>
          <div
            id={laneOptionsBeingShown()}
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
