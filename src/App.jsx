import { createSignal, For } from 'solid-js';
import styles from './App.module.css';

function App() {

  const [cards, setCards] = createSignal([
    { title: 'Planning a new version of the tutorial process', priority: '🔥 High' },
    { title: 'Iabadabadu', priority: 'Medium' },
    { title: 'outro', priority: 'Low' },
  ]);

  const [cardBeingDraggedIndex, setCardBeingDraggedIndex] = createSignal(null);
  const [cardToBeReplacedIndex, setCardToBeReplacedIndex] = createSignal(null);

  function swapCardsPosition() {
    const newCards = structuredClone(cards());
    const oldCard = structuredClone(newCards[cardBeingDraggedIndex()]);
    newCards[cardBeingDraggedIndex()] = newCards[cardToBeReplacedIndex()];
    newCards[cardToBeReplacedIndex()] = oldCard;
    setCards(newCards)
  }

  return (
    <div class={styles.App}>
      <main class={styles.main}>
        <div class={styles.foo}>
          <For each={cards()} fallback={<div>loading...</div>}>
            {(card, i) => (
              <>
                <div
                  class={styles.card}
                  draggable={true}
                  onDragStart={() => setCardBeingDraggedIndex(i)}
                  onDragEnd={() => swapCardsPosition()}
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
          {/* <div class={styles.slot}>
          </div> */}
        </div>
      </main>
    </div>
  );
}

export default App;
