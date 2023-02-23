import { createSignal, For, Show, onMount, onCleanup, createMemo, createEffect } from 'solid-js';
import styles from './App.module.css';
import ExpandedCard from './components/expanded-card';

function App() {
  const [lanes, setLanes] = createSignal([
    { id: 1, name: 'backlog' },
    { id: 2, name: 'sprint' },
    { id: 3, name: 'done' },
  ])
  const [cards, setCards] = createSignal([
    {
      title: 'A',
      id: 1,
      content: '# A',
      laneId: 1,
      tags: []
    },
    {
      title: 'B',
      id: 2,
      content: '# B',
      laneId: 2,
      tags: []
    },
    {
      title: 'C',
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
  const [selectedCard, setSelectedCard] = createSignal(null);
  const [cardIdOptionsBeingShown, setCardIdOptionsBeingShown] = createSignal(null);
  const [popupCoordinates, setPopupCoordinates] = createSignal();

  function getDefaultFromLocalStorage(key) {
    const defaultValue = localStorage.getItem(key);
    if (defaultValue === 'null') {
      return null;
    }
    return defaultValue;
  }

  function handleClickOutsideCardOptions(event) {
    if (cardIdOptionsBeingShown() !== null && event.target?.parentElement?.id !== `${cardIdOptionsBeingShown()}`) {
      setCardIdOptionsBeingShown(null);
    }
  }

  onMount(() => {
    window.addEventListener('mousedown', handleClickOutsideCardOptions)
  });

  onCleanup(() => {
    window.removeEventListener('mousedown', handleClickOutsideCardOptions)
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
    setCards(newCards)
  }

  function changeCardContent(newContent, cardId) {
    const newCards = structuredClone(cards())
    const newCardIndex = structuredClone(newCards.findIndex(card => card.id === cardId))
    const newCard = newCards[newCardIndex];
    newCard.content = newContent;
    const newTitle = getTitle(newContent)
    newCard.title = newTitle;
    const newTags = getTags(newContent);
    newCard.tags = newTags;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setSelectedCard(newCard);
  }

  /**
   * 
   * @param {string} text 
   * @returns string
   */
  function getTitle(text) {
    const textWithoutSpaces = text.trim();
    if (textWithoutSpaces.substring(0, 2) !== '# ') {
      return null;
    }
    const lineBreakIndex = textWithoutSpaces.indexOf('\n');
    let titleWithoutHashtag = textWithoutSpaces;
    if (lineBreakIndex > 0) {
      titleWithoutHashtag = textWithoutSpaces.substring(0, lineBreakIndex);
    }
    titleWithoutHashtag = titleWithoutHashtag.substring(2);
    return titleWithoutHashtag;
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
      .sort((a, b) => a.localeCompare(b))
    return tags;
  }

  function handleOptionBtnOnClick(event, id) {
    event.stopPropagation();
    const x = event.target.offsetLeft;
    const y = event.target.offsetTop + 25;
    setPopupCoordinates({ x, y });
    setCardIdOptionsBeingShown(id);
  }

  function deleteCard() {
    const newCards = structuredClone(cards());
    const cardsWithoutDeletedCard = newCards.filter(card => card.id !== cardIdOptionsBeingShown());
    setCards(cardsWithoutDeletedCard);
    setCardIdOptionsBeingShown(null);
  }

  const sortedCards = createMemo(() => {
    if (sortDirection() === null) {
      return cards();
    }
    if (sort() === 'title') {
      return sortCardsByTitle();
    }
    if (sort() === 'tags') {
      return sortCardsByTags();
    }
    return cards();
  });

  function sortCardsByTitle() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => sortDirection() === 'asc'
      ? a.title?.localeCompare(b.title)
      : b.title?.localeCompare(a.title)
    );
  }

  function sortCardsByTags() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      console.log(a.tags?.[0], b.tags?.[0])
      return sortDirection() === 'asc'
        ? a.tags?.[0]?.localeCompare(b.tags?.[0])
        : b.tags?.[0]?.localeCompare(a.tags?.[0])
    });
  }

  function updateSort() {
    if (sortDirection() === 'asc') {
      return setSortDirection('desc');
    }
    if (sortDirection() === 'desc') {
      return setSortDirection(null);
    }
    setSortDirection('asc');
    if (sort() === 'title') {
      setSort('tags')
    } else {
      setSort('title')
    }
  }

  createEffect(() => {
    localStorage.setItem('sort', sort());
    localStorage.setItem('sortDirection', sortDirection());
  })

  return (
    <div class={styles.App}>
      <main class={styles.main} id="main">
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
        <For each={lanes()} fallback={<div>loading...</div>}>
          {(lane, i) => (
            <div className="lane-container">
              <h2>{lane.name}</h2>
              <div
                class={styles.lane}
                onDragOver={() => moveCardToLane(lane.id)}
              >
                <For each={sortedCards().filter(card => card.laneId === lane.id)}>
                  {(card, j) => (
                    <>
                      <div
                        class={styles.card}
                        draggable={true}
                        onDragStart={() => setCardBeingDraggedId(card.id)}
                        onDragEnd={(event) => moveCardPosition(event)}
                        onDragOver={() => setCardToBeReplacedId(card.id)}
                        onClick={() => setSelectedCard(card)}
                      >
                        <div className="toolbar">
                          <h3 class={styles.h3}>{card.title || 'NO TITLE'}</h3>
                          <button onClick={event => handleOptionBtnOnClick(event, card.id)}>...</button>
                        </div>
                        <div className="tags">
                          <For each={card.tags}>
                            {tag => (
                              <div className="tag">
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
        <div>
          <button onClick={updateSort}>
            { sort() || 'no sort' } { sortDirection() || 'no sort direction' }
          </button>
        </div>
        <Show when={cardIdOptionsBeingShown()}>
          <div
            id={cardIdOptionsBeingShown()}
            className="popup"
            style={{
              top:`${popupCoordinates().y}px`,
              left: `${popupCoordinates().x}px`
            }}
          >
            <button onClick={deleteCard}>Delete</button>
          </div>
        </Show>
      </main>
    </div>
  );
}

export default App;
