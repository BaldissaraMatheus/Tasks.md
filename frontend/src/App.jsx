import { createSignal, For, Show, onMount, onCleanup, createMemo, createEffect, createResource } from 'solid-js';
import ExpandedCard from './components/expanded-card';
import { debounce } from "@solid-primitives/scheduled";
import { api } from './api'
import {polyfill} from "mobile-drag-drop";

function App() {
  const [lanes, setLanes] = createSignal([])
  const [cards, setCards] = createSignal([]);
  const [sort, setSort] = createSignal(getDefaultFromLocalStorage('sort'))
  const [sortDirection, setSortDirection] = createSignal(getDefaultFromLocalStorage('sortDirection'))
  const [cardBeingDraggedName, setCardBeingDragged] = createSignal(null);
  const [cardBeingDraggedOriginalLane, setCardBeingDraggedOriginalLane] = createSignal(null);
  const [cardDraggedOver, setCardDraggedOver] = createSignal(null);
  const [laneBeingDraggedName, setLaneBeingDraggedName] = createSignal(null);
  const [laneDraggedOverName, setLaneDraggedOverName] = createSignal(null);
  const [selectedCard, setSelectedCard] = createSignal(null);
  const [cardOptionsBeingShown, setCardOptionsBeingShown] = createSignal(null);
  const [laneOptionsBeingShown, setLaneOptionsBeingShown] = createSignal(null);
  const [popupCoordinates, setPopupCoordinates] = createSignal();
  const [search, setSearch] = createSignal('');
  const [laneBeingRenamed, setLaneBeingRenamed] = createSignal(null);
  const [newLaneName, setNewLaneName] = createSignal('');
  const [cardBeingRenamed, setCardBeingRenamed] = createSignal(null);
  const [newCardName, setNewCardName] = createSignal(null);
  const [filteredTag, setFilteredTag] = createSignal(null);
  const [cardError, setCardError] = createSignal(null);
  const [laneError, setLaneError] = createSignal(null);
  const [confirmationPromptCb, setConfirmationPromptCb] = createSignal(false);

  function fetchTitle() {
    return fetch(`${api}/title`).then(res => res.text());
  }

  function fetchLocalImagesUploadEnabled() {
    return fetch(`${api}/isLocalImageUploadEnabled`).then(res => res.json());
  }

  const [title] = createResource(fetchTitle);
  const [islocalImagesUploadEnabled] = createResource(fetchLocalImagesUploadEnabled);

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
      && event.target?.parentElement?.id !== `${cardOptionsBeingShown().name}`
    ) {
      setCardOptionsBeingShown(null);
      setConfirmationPromptCb(null);
    }
    if (
      laneOptionsBeingShown() !== null
      && event.target?.parentElement?.id !== `${laneOptionsBeingShown().name}`
    ) {
      setLaneOptionsBeingShown(null);
      setConfirmationPromptCb(null);
    }
  }

  async function fetchCards() {
    const cardsFromApiReq = fetch(`${api}/cards`, { method: 'GET', mode: 'cors' })
      .then(res => res.json())
      .then(cards => cards.map(card => ({ ...card, tags: getTags(card.content), laneBeforeDragging: card.lane })))
    const cardsSortedReq = fetch(`${api}/sort/cards`, { method: 'GET' })
      .then(res => res.json());
    const [cardsFromApi, cardsSorted] = await Promise.all([cardsFromApiReq, cardsSortedReq]);
    const cardsFromApiAndSorted = cardsSorted
      .map(cardNameFromLocalStorage => cardsFromApi
        .find(cardFromApi => cardFromApi.name === cardNameFromLocalStorage))
      .filter(card => !!card)
    const cardsFromApiNotYetSorted = cardsFromApi
      .filter(card => !cardsSorted.find(cardNameFromLocalStorage => cardNameFromLocalStorage === card.name));
    const newCards = [...cardsFromApiAndSorted, ...cardsFromApiNotYetSorted];
    setCards(newCards);
  }

  async function fetchLanes() {
    const lanesFromApiReq = fetch(`${api}/lanes`, { method: 'GET', mode: 'cors' })
      .then(res => res.json())
      .then(lanes => lanes.map(lane => ({ name: lane })));
    const lanesSortedReq = fetch(`${api}/sort/lanes`, { method: 'GET', })
      .then(res => res.json());
    const [lanesFromApi, lanesSorted] = await Promise.all([lanesFromApiReq, lanesSortedReq]);
    if (lanesFromApi.length <= lanes().length) {
      return;
    }
    const lanesFromApiAndSorted = lanesSorted
      .filter(sortedLane => lanesFromApi.find(lane => lane.name === sortedLane))
      .map(lane => lanesFromApi.find(laneFromApi => laneFromApi.name === lane));
    const lanesFromApiNotYetSorted = lanesFromApi.filter(lane => !lanesSorted.includes(lane.name));
    setLanes([...lanesFromApiAndSorted, ...lanesFromApiNotYetSorted]);
  }

  function moveCardBeingDraggedNextToCardDraggedOver() {
    const newCards = structuredClone(cards());
    const cardBeingDraggedIndex = newCards.findIndex(card => card.name === cardBeingDraggedName());
    const cardDraggedOverIndex = newCards.findIndex(card => card.name === cardDraggedOver());

    const cardBeingDraggedlane = newCards[cardBeingDraggedIndex].lane;
    const cardDraggedOverlane = newCards[cardDraggedOverIndex].lane;
    newCards[cardBeingDraggedIndex].lane = cardDraggedOverlane;

    const areBothCardsInSameLane = cardBeingDraggedlane === cardDraggedOverlane;
    let upOrDownDisplacement = 0;

    if (areBothCardsInSameLane) {
      upOrDownDisplacement = cardBeingDraggedIndex < cardDraggedOverIndex
        ? 1
        : 0;
    }

    const cardBeingDragged = newCards[cardBeingDraggedIndex];
    newCards[cardBeingDraggedIndex] = null;

    const cardsWithChangedPositions = [
      ...newCards.slice(0, cardDraggedOverIndex + upOrDownDisplacement),
      cardBeingDragged,
      ...newCards.slice(cardDraggedOverIndex + upOrDownDisplacement)
    ]
    .filter(card => card !== null);
    setCards(cardsWithChangedPositions);
    setCardDraggedOver(null);
    setCardBeingDragged(null);
  }

  const debounceUpdateCardLaneReq = debounce((card) => {
    fetch(`${api}/cards/${card.name}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lane: card.newLane })
    });
    setCardBeingDraggedOriginalLane(card.newLane);
  }, 250);

  function moveCardToLane() {
    const newLane = laneDraggedOverName();
    setLaneDraggedOverName(null);
    let newCards = structuredClone(cards());
    const cardBeingDraggedIndex = newCards.findIndex(card => card.name === cardBeingDraggedName());
    const newCard = structuredClone(newCards[cardBeingDraggedIndex]);
    if (newCard.lane === newLane) {
      return;
    }
    debounceUpdateCardLaneReq({ lane: cardBeingDraggedOriginalLane(), name: newCard.name, newLane });
    newCard.lane = newLane;
    newCards = newCards.filter((card, i) => i !== cardBeingDraggedIndex);
    newCards.push(newCard);
    setCards(newCards);
    setCardDraggedOver(null);
  }
  const debounceChangeCardContent = debounce((newContent) => changeCardContent(newContent), 250);

  function changeCardContent(newContent) {
    const newCards = structuredClone(cards())
    const newCardIndex = structuredClone(newCards.findIndex(card => card.name === selectedCard().name
      && card.lane === selectedCard().lane
    ));
    const newCard = newCards[newCardIndex];
    newCard.content = newContent;
    const newTags = getTags(newContent);
    newCard.tags = newTags;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setSelectedCard(newCard);
    fetch(`${api}/cards/${newCard.name}`, {
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
    const btnCoordinates = event.target.getBoundingClientRect();
    let x = btnCoordinates.x + event.target.offsetWidth - 3;
    const menuWidth = 82;
    const offsetX = x + menuWidth >= window.innerWidth ? 82 : 0;
    x -= offsetX;
    const offsetY = offsetX ? 0 : 3;
    const y = btnCoordinates.y + event.target.offsetHeight - offsetY;
    setPopupCoordinates({ x, y });
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

  function handleFilterSelectOnChange(e) {
    const value = e.target.value;
    if (value === 'none') {
      return setFilteredTag(null);
    }
    setFilteredTag(value);
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
    newCards.unshift(newCard);
    setCards(newCards);
    startRenamingCard(cards()[0]);
  }

  function startRenamingCard(card) {
    setCardBeingRenamed(card);
    setNewCardName(card.name)
    document.getElementById(`${card.name}-rename-input`).focus();
    document.getElementById(`${card.name}-rename-input`).select();
    setCardOptionsBeingShown(null);
  }

  function renameCard(e) {
    if (e.key && e.key !== 'Enter') {
      return;
    }
    if (cardError()) {
      setNewCardName(null);
      setCardBeingRenamed(null);
      setCardError(null);
      return;
    }
    const newCards = structuredClone(cards());
    const newCardIndex = newCards.findIndex(card => card.name === cardBeingRenamed()?.name);
    const newCard = newCards[newCardIndex];
    const newCardNameWithoutSpaces = newCardName().trim();
    fetch(`${api}/cards/${newCard.name}`, {
      method: 'PATCH',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCardNameWithoutSpaces })
    });
    newCard.name = newCardNameWithoutSpaces;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setCardBeingRenamed(null);
  }

  function deleteCard() {
    const newCards = structuredClone(cards());
    fetch(`${api}/cards/${cardOptionsBeingShown().name}`, { method: 'DELETE', mode: 'cors' })
    const cardsWithoutDeletedCard = newCards.filter(card => card.name !== cardOptionsBeingShown().name);
    setCards(cardsWithoutDeletedCard);
    setCardOptionsBeingShown(null);
    setConfirmationPromptCb(null);
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
    startRenamingLane(lanes()[lanes().length - 1]);
  }

  function moveLanePosition(event) {
    event.stopPropagation();
    const newLanes = structuredClone(lanes());
    const laneBeingDraggedIndex = newLanes.findIndex(lane => lane.name === laneBeingDraggedName());
    const laneToBeReplacedIndex = newLanes.findIndex(lane => lane.name === laneDraggedOverName());
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
    setLaneDraggedOverName(null);
    setLaneBeingDraggedName(null);
  }

  function startRenamingLane(laneToBeRenamed) {
    setLaneBeingRenamed(laneToBeRenamed);
    setNewLaneName(lanes().find(lane => lane.name === laneToBeRenamed.name).name)
    document.getElementById(`${laneToBeRenamed.name}-rename-input`).focus();
    document.getElementById(`${laneToBeRenamed.name}-rename-input`).select();
    setLaneOptionsBeingShown(null);
  }

  function renameLane(e) {
    if (e.key && e.key !== 'Enter') {
      return;
    }
    if (laneError()) {
      setNewLaneName(null);
      setLaneBeingRenamed(null);
      setLaneError(null);
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
    const newCards = structuredClone(cards())
      .map(card => ({
        ...card,
        lane: card.lane === newLane.name ? newLaneName() : card.lane
      }));
    setCards(newCards);
    newLane.name = newLaneName();
    newLanes[newLaneIndex] = newLane;
    setLanes(newLanes);
    setLaneBeingRenamed(null);
  }

  function deleteLane() {
    const newLanes = structuredClone(lanes());
    fetch(`${api}/lanes/${laneOptionsBeingShown().name}`, { method: 'DELETE', mode: 'cors' })
    const lanesWithoutDeletedCard = newLanes.filter(lane => lane.name !== laneOptionsBeingShown().name);
    setLanes(lanesWithoutDeletedCard);
    setLaneOptionsBeingShown(null);
    setConfirmationPromptCb(null);
  }

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

  function handleOnSelectedCardNameChange(newName) {
    const newCards = structuredClone(cards())
    const newCardIndex = structuredClone(newCards.findIndex(card => card.name === selectedCard().name
      && card.lane === selectedCard().lane
    ));
    const newCard = newCards[newCardIndex];
    newCard.name = newName;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setSelectedCard(newCard);
  }

  function deleteCardsFromLane() {
    const lane = laneOptionsBeingShown();
    const cardsToDelete = cards().filter(card => card.lane === lane.name);
    cardsToDelete
      .forEach(card => fetch(`${api}/cards/${card.name}`, { method: 'DELETE', mode: 'cors' }));
    const cardsToKeep = cards().filter(card => card.lane !== lane.name);
    setCards(cardsToKeep);
    setLaneOptionsBeingShown(null);
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

  const usedTags = createMemo(() => {
    const allTags = cards()
      .map(card => card.tags)
      .flat()
      .filter(tag => !!tag)
    const tagsWithoutDuplicates = Array.from(new Set(allTags));
    return tagsWithoutDuplicates;
  });

  onMount(async () => {
    const url = window.location.href;
    if (!url.match(/\/$/)) {
      window.location.replace(`${url}/`)
    }
    window.addEventListener('mousedown', handleClickOutsideOptions);
    fetchCards();
    fetchLanes();
    polyfill({});
  });

  createEffect(() => {
    if (title()) {
      document.title = title();
    }
  })

  createEffect(() => {
    localStorage.setItem('sort', sort());
    localStorage.setItem('sortDirection', sortDirection());
  });

  createEffect(() => {
    if (!lanes().length) {
      return;
    }
    fetch(`${api}/sort/lanes`, {
      method: 'POST',
      body: JSON.stringify(lanes().map(lane => lane.name)),
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    });
  });

  createEffect(() => {
    if (!!sort() || !cards().length) {
      return;
    }
    const cardsNames = cards().map(card => card.name);
    fetch(`${api}/sort/cards`, {
      method: 'POST',
      body: JSON.stringify(cardsNames),
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    });
  });

  function validateNewCardName(newName) {
    if (newName === null) {
      return;
    }
    if (newName === '') {
      return 'The card must have a name';
    }
    if (cards().filter(card => card.name === newName).length > 0) {
      return 'There\'s already a card with that name';
    }
    return null;
  }

  createEffect(() => {
    if (cardBeingRenamed()?.name === newCardName()) {
      return setCardError(null);
    }
    setCardError(validateNewCardName(newCardName()));
  });

  createEffect(() => {
    if (newLaneName() === null) {
      return;
    }
    if (newLaneName() === '') {
      return setLaneError('The lane must have a name');
    }
    if (lanes()
      .filter(lane => lane.name === newLaneName()
      && lane.name !== laneBeingRenamed()?.name)
      .length
    ) {
      return setLaneError('There\'s already a lane with that name');
    }
    setLaneError(null);
  });

  onCleanup(() => {
    window.removeEventListener('mousedown', handleClickOutsideOptions)
  });

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
          <div class="app-header__group-item-label">Filter by tag:</div>
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
      { title() ? <h1 class="app-title">{ title() }</h1> : <></> }
      <main class={`lanes ${title() ? 'lanes--has-title' : ''}`}>
        <Show when={!!selectedCard()}>
          <ExpandedCard
            name={selectedCard().name}
            content={selectedCard().content}
            tags={selectedCard().tags}
            allTags={usedTags()}
            onExit={() => setSelectedCard(null)}
            onContentChange={(value) => debounceChangeCardContent(value, selectedCard().id)}
            onNameChange={handleOnSelectedCardNameChange}
            onTagClick={(tagId) => removeTagFromCard(tagId)}
            validateFn={validateNewCardName}
            disableImageUpload={!islocalImagesUploadEnabled()}
          />
        </Show>
        <For each={lanes()}>
          {lane => (
            <div
              class={`lane ${laneDraggedOverName() === lane.name ? 'dragged-over' : ''}`}
              onDragEnter={e => e.preventDefault()}
              onDragEnd={e => laneBeingDraggedName() ? moveLanePosition(e) : null}
              onDragOver={() => setLaneDraggedOverName(lane?.name)}
            >
              <header
                class="lane__header"
                draggable={!laneBeingRenamed()}
                onDragEnter={e => e.preventDefault()}
                onDragStart={() => setLaneBeingDraggedName(lane.name)}
              >
                <div class="lane__header-name-and-count">
                  { laneBeingRenamed()?.name === lane.name
                    ? <div class="input-and-error-msg">
                      <input
                        type="text"
                        id={`${lane.name}-rename-input`}
                        value={newLaneName()}
                        onInput={e => setNewLaneName(e.target.value)}
                        onFocusOut={renameLane}
                        onKeyUp={renameLane}
                        class={laneError() ? 'error' : ''}
                      ></input>
                      { laneError()
                        ? <span class="error-msg">{ laneError() }</span>
                        : <></>
                      }
                    </div>
                    : <strong>
                      {lane?.name}
                    </strong>
                  }
                  { laneBeingRenamed()?.name === lane.name
                    ? <></>
                    : <h5 class="tag counter">
                      {sortedCards().filter(card => card.lane === lane.name).length}
                    </h5>
                  }
                </div>
                { laneBeingRenamed()?.name === lane.name
                  ? <></>
                  : <div class="lane__header-buttons">
                    <button
                      title="Create new card"
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
                        setLaneOptionsBeingShown(lane);
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                }
              </header>
              <div class="lane__content">
                <For
                  each={
                    sortedCards()
                      .filter(card => card.lane === lane.name)
                      .filter(card => card.name.toLowerCase().includes(search().toLowerCase())
                        || card.content.toLowerCase().includes(search().toLowerCase())
                      )
                      .filter(card => filteredTag() === null || (card.tags?.includes(filteredTag())))
                  }
                >
                  {card => (
                    <div
                      class={`card ${cardDraggedOver() === card.name ? 'dragged-over' : ''}`}
                      draggable={!cardBeingRenamed()}
                      onDragEnter={e => e.preventDefault()}
                      onDragStart={() => {
                        setCardBeingDragged(card.name);
                        setCardBeingDraggedOriginalLane(card.lane)
                      }}
                      onDragOver={(e) => {
                        e.stopPropagation();
                        if (cardBeingDraggedName()) {
                          setCardDraggedOver(card.name);
                          setLaneDraggedOverName(null);
                        }
                      }}
                      onDragEnd={(e) => laneDraggedOverName() ? moveCardToLane() : moveCardBeingDraggedNextToCardDraggedOver()}
                      onClick={() => !cardBeingRenamed() ? setSelectedCard(card) : null}
                    >
                      <div class="card__toolbar">
                        { cardBeingRenamed()?.name === card.name
                          ? <div class="input-and-error-msg">
                            <input
                              type="text"
                              id={`${card.name}-rename-input`}
                              value={newCardName()}
                              onClick={e => e.stopPropagation()}
                              onInput={e => setNewCardName(e.target.value)}
                              onFocusOut={renameCard}
                              onKeyUp={renameCard}
                              class={cardError() ? 'error' : ''}
                            ></input>
                            { cardError()
                              ? <span class="error-msg">{ cardError() }</span>
                              : <></>
                            }
                            </div>
                          : <div>{card.content ? '📝 ' : ''}{card.name}</div>
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
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <Show when={cardOptionsBeingShown() && !confirmationPromptCb()}>
          <div
            id={cardOptionsBeingShown()?.name}
            class="popup"
            style={{
              top:`${popupCoordinates().y}px`,
              left: `${popupCoordinates().x}px`
            }}
          >
            <button onClick={() => startRenamingCard(cardOptionsBeingShown())}>Rename</button>
            <button onClick={() => setConfirmationPromptCb(deleteCard)}>Delete</button>
          </div>
        </Show>
        <Show when={laneOptionsBeingShown() && !confirmationPromptCb()}>
          <div
            id={laneOptionsBeingShown().name}
            class="popup"
            style={{
              top:`${popupCoordinates().y}px`,
              left: `${popupCoordinates().x}px`
            }}
          >
            <button onClick={() => startRenamingLane(laneOptionsBeingShown())}>Rename</button>
            <button onClick={() => setConfirmationPromptCb(() => deleteCardsFromLane)}>Delete cards</button>
            <button onClick={() => setConfirmationPromptCb(() => deleteLane)}>Delete lane</button>
          </div>
        </Show>
        <Show when={laneOptionsBeingShown() && confirmationPromptCb()}>
          <div
            id={laneOptionsBeingShown().name}
            class="popup"
            style={{
              top:`${popupCoordinates().y}px`,
              left: `${popupCoordinates().x}px`
            }}
          >
            <button onClick={() => {
              confirmationPromptCb()();
              setConfirmationPromptCb(null);
            }}>
              Are you sure?
            </button>
            <button onClick={() => {
              setConfirmationPromptCb(null);
              setLaneOptionsBeingShown(null);
              setCardOptionsBeingShown(null);
            }}>
              Cancel
            </button>
          </div>
        </Show>
      </main>
    </>
  );
}

export default App;
