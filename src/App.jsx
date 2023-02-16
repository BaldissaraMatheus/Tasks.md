import { createSignal, For, Show, onMount, createEffect, onCleanup } from 'solid-js';
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
      title: null,
      priority: '🔥 High',
      id: 1,
      content: 'alsdasldjaskldj',
      laneId: 1,
    },
    {
      title: null,
      priority: '🔔 Medium',
      id: 2,
      content: 'alsdasldjaskldj',
      laneId: 2,
    },
    {
      title: null,
      priority: '🤏 Low',
      id: 3,
      content: 'alsdasldjaskldj',
      laneId: 2,
    },
  ]);
  const [cardBeingDraggedId, setCardBeingDraggedId] = createSignal(null);
  const [cardToBeReplacedId, setCardToBeReplacedId] = createSignal(null);
  const [selectedCard, setSelectedCard] = createSignal(null);
  const [cardIdOptionsBeingShown, setCardIdOptionsBeingShown] = createSignal(null);
  const [popupCoordinates, setPopupCoordinates] = createSignal();

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
    const newTitle = getTitle(newContent)
    newCard.title = newTitle;
    newCard.content = newContent;
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
    const firstBlankLine = textWithoutSpaces.indexOf('\n');
    let titleWithoutHashtag = textWithoutSpaces;
    if (firstBlankLine > 0) {
      titleWithoutHashtag = textWithoutSpaces.substring(0, firstBlankLine);
    }
    titleWithoutHashtag = titleWithoutHashtag.substring(2);
    return titleWithoutHashtag;
  }

  function handleOptionBtnOnClick(event, id) {
    event.stopPropagation();
    const x = event.target.offsetLeft;
    const y = event.target.offsetTop + 25;
    setPopupCoordinates({ x, y });
    setCardIdOptionsBeingShown(id);
  }

  function handleDeleteCard() {
    const newCards = structuredClone(cards());
    const cardsWithoutDeletedCard = newCards.filter(card => card.id !== cardIdOptionsBeingShown());
    setCards(cardsWithoutDeletedCard);
    setCardIdOptionsBeingShown(null);
  }

  return (
    <div class={styles.App}>
      <main class={styles.main} id="main">
        <Show when={!!selectedCard()}>
          <ExpandedCard
            title={selectedCard().title}
            content={selectedCard().content}
            onExit={() => setSelectedCard(null)}
            onChange={(value) => changeCardContent(value, selectedCard().id)}
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
                <For each={cards().filter(card => card.laneId === lane.id)}>
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
                        <div class={styles.chip}>
                          <h4 class={styles.h4}>{card.priority}</h4>
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
            className="popup"
            style={{
              top:`${popupCoordinates().y}px`,
              left: `${popupCoordinates().x}px`
            }}
          >
            <button onClick={handleDeleteCard}>Delete</button>
          </div>
        </Show>
      </main>
    </div>
  );
}

export default App;
