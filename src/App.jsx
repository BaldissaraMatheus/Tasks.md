import { createSignal, For, Show, onMount, createEffect } from 'solid-js';
import styles from './App.module.css';
import ExpandedCard from './components/expanded-card';


function App() {
  const [cards, setCards] = createSignal([
    {
      title: null,
      priority: '🔥 High',
      id: 1,
      content: 'alsdasldjaskldj'
    },
    {
      title: null,
      priority: '🔔 Medium',
      id: 2,
      content: 'alsdasldjaskldj'
    },
    {
      title: null,
      priority: '🤏 Low',
      id: 3,
      content: 'alsdasldjaskldj'
    },
  ]);

  const [cardBeingDraggedIndex, setCardBeingDraggedIndex] = createSignal(null);
  const [cardToBeReplacedIndex, setCardToBeReplacedIndex] = createSignal(null);

  const [selectedCard, setSelectedCard] = createSignal(null);

  function moveCardPosition() {
    const newCards = structuredClone(cards());
    const cardBeingDragged = newCards[cardBeingDraggedIndex()];
    newCards[cardBeingDraggedIndex()] = null;
    const upOrDownDisplacement = cardBeingDraggedIndex() < cardToBeReplacedIndex()
      ? 1
      : 0;
    const cardsWithChangedPositions = [
      ...newCards.slice(0, cardToBeReplacedIndex() + upOrDownDisplacement),
      cardBeingDragged,
      ...newCards.slice(cardToBeReplacedIndex() + upOrDownDisplacement)
    ]
    .filter(card => card !== null);
    setCards(cardsWithChangedPositions);
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
        <div class={styles.lane}>
          <For each={cards()} fallback={<div>loading...</div>}>
            {(card, i) => (
              <>
                <div
                  class={styles.card}
                  draggable={true}
                  onDragStart={() => setCardBeingDraggedIndex(i)}
                  onDragEnd={() => moveCardPosition()}
                  onDragOver={() => setCardToBeReplacedIndex(i)}
                  onClick={() => setSelectedCard(card)}
                >
                  <h3 class={styles.h3}>{card.title || 'NO TITLE'}</h3>
                  <div class={styles.chip}>
                    <h4 class={styles.h4}>{card.priority}</h4>
                  </div>
                </div>
              </>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}

export default App;
