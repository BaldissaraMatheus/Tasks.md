import { createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import styles from './App.module.css';

function App() {

  const [cards, setCards] = createSignal([
    { title: 'Planning a new version of the tutorial process', priority: '🔥 High', id: 1 },
    { title: 'Iabadabadu', priority: 'Medium', id: 2 },
    { title: 'outro', priority: 'Low', id: 3 },
  ]);

  const [cardBeingDraggedIndex, setCardBeingDraggedIndex] = createSignal(null);
  const [cardToBeReplacedIndex, setCardToBeReplacedIndex] = createSignal(null);

  const [selectedCardId, setSelectedCardId] = createSignal(null);

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

  return (
    <div class={styles.App}>
      <main class={styles.main} id="main">
        <Show when={!!selectedCardId()}>
          <div class={styles.modalBg} onClick={() => setSelectedCardId(null)}>
            <div class={styles.modal} onClick={() => stopPropation()}>
              { cards().find(card => card.id === selectedCardId())?.title }
            </div>
          </div>
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
                  onClick={() => setSelectedCardId(card.id)}
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
