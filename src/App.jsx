import { createSignal, For } from 'solid-js';
import styles from './App.module.css';

function App() {

  const [cards, setCards] = createSignal([
    { title: 'Planning a new version of the tutorial process', priority: '🔥 High', id: 0 },
    { title: 'Iabadabadu', priority: 'Medium', id: 1 },
    { title: 'outro', priority: 'Low', id: 2 },
  ]);

  const [cardBeingDraggedIndex, setCardBeingDraggedIndex] = createSignal(null);
  const [cardToBeReplacedIndex, setCardToBeReplacedIndex] = createSignal(null);

  function MoveCardPosition() {
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

  return (
    <div class={styles.App}>
      <main class={styles.main}>
        <div class={styles.lane}>
          <For each={cards()} fallback={<div>loading...</div>}>
            {(card, i) => (
              <>
                <div
                  class={styles.card}
                  draggable={true}
                  onDragStart={() => setCardBeingDraggedIndex(i)}
                  onDragEnd={() => MoveCardPosition()}
                  onDragOver={() => setCardToBeReplacedIndex(i)}
                >
                  <h3 class={styles.h3}>{card.title}</h3>
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
