import {
  createSignal,
  For,
  Show,
  onMount,
  createMemo,
  createEffect,
  createResource,
  onCleanup,
} from "solid-js";
import Sortable from "sortablejs";
import ExpandedCard from "./components/expanded-card";
import { Lane } from "./components/lane";
import { debounce } from "@solid-primitives/scheduled";
import { api } from "./api";
import { polyfill } from "mobile-drag-drop";
import { LaneName } from "./components/lane-name";
import { NameInput } from "./components/name-input";
import { Header } from "./components/header";
import { Card } from "./components/card";
import { CardName } from "./components/card-name";

function App() {
  const [lanes, setLanes] = createSignal([]);
  const [cards, setCards] = createSignal([]);
  // TODO Use makePersisted for sort and sortDirection
  const [sort, setSort] = createSignal(getDefaultFromLocalStorage("sort"));
  const [sortDirection, setSortDirection] = createSignal(
    getDefaultFromLocalStorage("sortDirection")
  );
  const [selectedCard, setSelectedCard] = createSignal(null);
  const [search, setSearch] = createSignal("");
  const [filteredTag, setFilteredTag] = createSignal(null);
  const [tagsOptions, setTagsOptions] = createSignal([]);
  const [laneBeingRenamedName, setLaneBeingRenamedName] = createSignal(null);
  const [newLaneName, setNewLaneName] = createSignal(null);
  const [cardBeingRenamed, setCardBeingRenamed] = createSignal(null);
  const [newCardName, setNewCardName] = createSignal(null);
  const [sortableLanes, setSortableLanes] = createSignal(null);

  function fetchTitle() {
    return fetch(`${api}/title`).then((res) => res.text());
  }

  const [title] = createResource(fetchTitle);

  function getDefaultFromLocalStorage(key) {
    const defaultValue = localStorage.getItem(key);
    if (defaultValue === "null") {
      return null;
    }
    return defaultValue;
  }

  function getTagsByTagNames(tags, tagNames) {
    return tagNames.map((tagName) => {
      const foundTag = tags.find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
      );
      const backgroundColor = foundTag?.backgroundColor || "var(--tag-color-1)";
      return { name: tagName, backgroundColor };
    });
  }

  async function fetchCards() {
    const tagsReq = fetch(`${api}/tags`, { method: "GET", mode: "cors" }).then(
      (res) => res.json()
    );
    const cardsReq = fetch(`${api}/cards`, {
      method: "GET",
      mode: "cors",
    }).then((res) => res.json());
    const cardsSortReq = fetch(`${api}/sort/cards`, { method: "GET" }).then(
      (res) => res.json()
    );
    const [tags, cardsFromApi, cardsSort] = await Promise.all([
      tagsReq,
      cardsReq,
      cardsSortReq,
    ]);
    setTagsOptions(tags);
    const cardsFromApiAndSorted = cardsSort
      .map((cardNameFromLocalStorage) =>
        cardsFromApi.find(
          (cardFromApi) => cardFromApi.name === cardNameFromLocalStorage
        )
      )
      .filter((card) => !!card);
    const cardsFromApiNotYetSorted = cardsFromApi.filter(
      (card) =>
        !cardsSort.find(
          (cardNameFromLocalStorage) => cardNameFromLocalStorage === card.name
        )
    );
    const newCards = [...cardsFromApiAndSorted, ...cardsFromApiNotYetSorted];
    const newCardsWithTags = newCards.map((card) => {
      const newCard = structuredClone(card);
      const cardTagsNames = getTags(card.content) || [];
      newCard.tags = getTagsByTagNames(tags, cardTagsNames);
      return newCard;
    });
    setCards(newCardsWithTags);
  }

  async function fetchLanes() {
    const lanesFromApiReq = fetch(`${api}/lanes`, {
      method: "GET",
      mode: "cors",
    }).then((res) => res.json());
    const lanesSortedReq = fetch(`${api}/sort/lanes`, { method: "GET" }).then(
      (res) => res.json()
    );
    const [lanesFromApi, lanesSorted] = await Promise.all([
      lanesFromApiReq,
      lanesSortedReq,
    ]);
    if (lanesFromApi.length <= lanes().length) {
      return;
    }
    const lanesFromApiAndSorted = lanesSorted
      .filter((sortedLane) => lanesFromApi.find((lane) => lane === sortedLane))
      .map((lane) => lanesFromApi.find((laneFromApi) => laneFromApi === lane));
    const lanesFromApiNotYetSorted = lanesFromApi.filter(
      (lane) => !lanesSorted.includes(lane)
    );
    setLanes([...lanesFromApiAndSorted, ...lanesFromApiNotYetSorted]);
  }

  const debounceChangeCardContent = debounce(
    (newContent) => changeCardContent(newContent),
    250
  );

  async function changeCardContent(newContent) {
    const newCards = structuredClone(cards());
    const newCardIndex = structuredClone(
      newCards.findIndex(
        (card) =>
          card.name === selectedCard().name && card.lane === selectedCard().lane
      )
    );
    const newCard = newCards[newCardIndex];
    newCard.content = newContent;
    await fetch(`${api}/cards/${newCard.name}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    const tags = await fetch(`${api}/tags`, {
      method: "GET",
      mode: "cors",
    }).then((res) => res.json());
    setTagsOptions(tags);
    const cardTagsNames = getTags(newContent);
    newCard.tags = getTagsByTagNames(tags, cardTagsNames);
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setSelectedCard(newCard);
  }

  function getTags(text) {
    const indexOfTagsKeyword = text.toLowerCase().indexOf("tags: ");
    if (indexOfTagsKeyword === -1) {
      return [];
    }
    let startOfTags = text.substring(indexOfTagsKeyword + "tags: ".length);
    const lineBreak = text.indexOf("\n");
    if (lineBreak > 0) {
      startOfTags = startOfTags.split("\n")[0];
    }
    const tags = startOfTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");
    return tags;
  }

  function handleSortSelectOnChange(e) {
    const value = e.target.value;
    if (value === "none") {
      setSort(null);
      return setSortDirection(null);
    }
    const [newSort, newSortDirection] = value.split(":");
    setSort(newSort);
    setSortDirection(newSortDirection);
  }

  function handleFilterSelectOnChange(e) {
    const value = e.target.value;
    if (value === "none") {
      return setFilteredTag(null);
    }
    setFilteredTag(value);
  }

  async function createNewCard(lane) {
    const newCards = structuredClone(cards());
    const newCard = { lane };
    const newCardName = await fetch(`${api}/cards`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane: newCard.lane }),
    }).then((res) => res.text());
    newCard.name = newCardName;
    newCards.unshift(newCard);
    setCards(newCards);
    startRenamingCard(cards()[0]);
  }

  function deleteCard(card) {
    const newCards = structuredClone(cards());
    fetch(`${api}/cards/${card.name}`, {
      method: "DELETE",
      mode: "cors",
    });
    const cardsWithoutDeletedCard = newCards.filter(
      (cardToFind) => cardToFind.name !== card.name
    );
    setCards(cardsWithoutDeletedCard);
  }

  async function createNewLane() {
    const newLanes = structuredClone(lanes());
    const newName = await fetch(`${api}/lanes`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
    }).then((res) => res.text());
    newLanes.push(newName);
    setLanes(newLanes);
    setNewLaneName(newName);
    setLaneBeingRenamedName(newName);
  }

  function renameLane() {
    fetch(`${api}/lanes/${laneBeingRenamedName()}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newLaneName() }),
    });
    const newLanes = structuredClone(lanes());
    const newLaneIndex = newLanes.findIndex(
      (laneToFind) => laneToFind === laneBeingRenamedName()
    );
    const newLane = newLanes[newLaneIndex];
    const newCards = structuredClone(cards()).map((card) => ({
      ...card,
      lane: card.lane === newLane ? newLaneName() : card.lane,
    }));
    setCards(newCards);
    newLanes[newLaneIndex] = newLaneName();
    setLanes(newLanes);
    setNewLaneName(null);
    setLaneBeingRenamedName(null);
  }

  function deleteLane(lane) {
    fetch(`${api}/lanes/${lane}`, {
      method: "DELETE",
      mode: "cors",
    });
    const newLanes = structuredClone(lanes());
    const lanesWithoutDeletedCard = newLanes.filter(
      (laneToFind) => laneToFind !== lane
    );
    setLanes(lanesWithoutDeletedCard);
    const newCards = cards().filter((card) => card.lane !== lane);
    setCards(newCards);
  }

  function sortCardsByName() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) =>
      sortDirection() === "asc"
        ? a.name?.localeCompare(b.name)
        : b.name?.localeCompare(a.name)
    );
  }

  function sortCardsByTags() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return sortDirection() === "asc"
        ? a.tags[0]?.name.localeCompare(b.tags?.[0])
        : b.tags[0]?.name.localeCompare(a.tags?.[0]);
    });
  }

  function handleOnSelectedCardNameChange(newName) {
    const newCards = structuredClone(cards());
    const newCardIndex = structuredClone(
      newCards.findIndex(
        (card) =>
          card.name === selectedCard().name && card.lane === selectedCard().lane
      )
    );
    const newCard = newCards[newCardIndex];
    newCard.name = newName;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setSelectedCard(newCard);
  }

  function handleDeleteCardsByLane(lane) {
    const cardsToDelete = cards().filter((card) => card.lane === lane);
    cardsToDelete.forEach((card) =>
      fetch(`${api}/cards/${card.name}`, { method: "DELETE", mode: "cors" })
    );
    const cardsToKeep = cards().filter((card) => card.lane !== lane);
    setCards(cardsToKeep);
  }

  function renameCard() {
    const newCards = structuredClone(cards());
    const newCardIndex = newCards.findIndex(
      (card) => card.name === cardBeingRenamed()?.name
    );
    const newCard = newCards[newCardIndex];
    const newCardNameWithoutSpaces = newCardName().trim();
    fetch(`${api}/cards/${newCard.name}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCardNameWithoutSpaces }),
    });
    newCard.name = newCardNameWithoutSpaces;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setCardBeingRenamed(null);
  }

  async function handleTagColorChange() {
    await fetchCards();
    const newCardIndex = structuredClone(
      cards().findIndex(
        (card) =>
          card.name === selectedCard().name && card.lane === selectedCard().lane
      )
    );
    setSelectedCard(cards()[newCardIndex]);
  }

  const sortedCards = createMemo(() => {
    if (sortDirection() === null) {
      return cards();
    }
    if (sort() === "name") {
      return sortCardsByName();
    }
    if (sort() === "tags") {
      return sortCardsByTags();
    }
    return cards();
  });

  function validateName(newName, namesList, item) {
    if (newName === null) {
      return null;
    }
    if (newName === "") {
      return `The ${item} must have a name`;
    }
    if (namesList.filter((name) => name === newName).length) {
      return `There's already a ${item} with that name`;
    }
    return null;
  }

  function startRenamingLane(lane) {
    setNewLaneName(lane);
    setLaneBeingRenamedName(lane);
  }

  const filteredCards = createMemo(() =>
    sortedCards()
      .filter(
        (card) =>
          card.name.toLowerCase().includes(search().toLowerCase()) ||
          (card.content || "").toLowerCase().includes(search().toLowerCase())
      )
      .filter(
        (card) =>
          filteredTag() === null ||
          card.tags
            ?.map((tag) => tag.name?.toLowerCase())
            .includes(filteredTag().toLowerCase())
      )
  );

  function getCardsFromLane(lane) {
    return filteredCards().filter((card) => card.lane === lane);
  }

  function startRenamingCard(card) {
    setNewCardName(card.name);
    setCardBeingRenamed(card);
  }

  onMount(() => {
    const el = document.getElementById("lanes");
    setSortableLanes(
      Sortable.create(el, {
        animation: 150,
        onSort: (e) => handleSortableSort(e, lanes(), setLanes),
      })
    );
    const url = window.location.href;
    if (!url.match(/\/$/)) {
      window.location.replace(`${url}/`);
    }
    fetchCards();
    fetchLanes();
    polyfill({});
  });

  onCleanup(() => {
    if (sortableLanes()) {
      sortableLanes().destroy();
    }
  });

  createEffect(() => {
    if (title()) {
      document.title = title();
    }
  });

  createEffect(() => {
    localStorage.setItem("sort", sort());
    localStorage.setItem("sortDirection", sortDirection());
  });

  createEffect(() => {
    if (!lanes().length) {
      return;
    }
    fetch(`${api}/sort/lanes`, {
      method: "POST",
      body: JSON.stringify(lanes()),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const newCards = lanes()
      .map((lane) => cards().filter((card) => card.lane === lane))
      .flat();
    const cardNames = newCards.map((card) => card.name);
    console.log(cardNames)
    fetch(`${api}/sort/cards`, {
      method: "POST",
      body: JSON.stringify(cardNames),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  });

  function handleSortableSort(event, originalList, setList) {
    // https://github.com/SortableJS/Sortable/issues/546#issuecomment-1892931258
    event.item.remove();
    if (event.oldIndex !== undefined) {
      event.from.insertBefore(event.item, event.from.children[event.oldIndex]);
    }
    const { oldIndex, newIndex } = event;
    const addend = newIndex - oldIndex > 0 ? 1 : -1;
    const newList = structuredClone(originalList);
    for (let i = oldIndex; i !== newIndex; i += addend) {
      const oldValue = newList[i];
      newList[i] = newList[i + addend];
      newList[i + addend] = oldValue;
    }
    setList(newList);
  }

  function handleCardsSortChange(event) {
    event.item.remove();
    if (event.oldIndex !== undefined) {
      event.from.insertBefore(event.item, event.from.children[event.oldIndex]);
    }
    const cardName = event.item.id.substring(5);
    const oldIndex = cards().findIndex((card) => card.name === cardName);
    const newCard = structuredClone(cards()[oldIndex]);
    const targetLane = event.to.parentNode.id.substring(5);
    const laneIndex = lanes().findIndex((lane) => lane.name === targetLane);
    const prevLanes = lanes().filter((lane, i) => i < laneIndex);
    const prevIndexes = cards().filter((card) =>
      prevLanes.includes(card.lane)
    ).length;
    const newIndex = prevIndexes + event.newIndex;
    newCard.lane = targetLane;
    let newCards = cards().filter((card, index) => index !== oldIndex);
    console.log(
      newIndex,
      newCards.slice(0, newIndex),
      newCards.slice(newIndex),
      [...newCards.slice(0, newIndex), newCard, ...newCards.slice(newIndex)]
    );
    newCards = [
      ...newCards.slice(0, newIndex),
      newCard,
      ...newCards.slice(newIndex),
    ];
    newCards = lanes()
      .map((lane) => newCards.filter((card) => card.lane === lane))
      .flat();
    setCards(newCards);
    console.log(newCards);
    fetch(`${api}/cards/${newCard.name}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane: newCard.lane }),
    });
  }

  return (
    <>
      <Header
        search={search()}
        onSearchChange={setSearch}
        sort={sort() === null ? "none" : `${sort()}:${sortDirection()}`}
        onSortChange={handleSortSelectOnChange}
        tagOptions={tagsOptions().map((option) => option.name)}
        filteredTag={filteredTag()}
        onTagChange={handleFilterSelectOnChange}
        onNewLaneBtnClick={createNewLane}
      />
      {title() ? <h1 class="app-title">{title()}</h1> : <></>}
      <main
        id="lanes"
        class={`lanes ${title() ? "lanes--has-title" : ""}`}
        tabIndex="-1"
      >
        <For each={lanes()}>
          {(lane) => (
            <Lane
              name={lane}
              onCardsSortChange={handleCardsSortChange}
              headerSlot={
                laneBeingRenamedName() === lane ? (
                  <NameInput
                    value={newLaneName()}
                    errorMsg={validateName(
                      newLaneName(),
                      lanes().filter((lane) => lane !== laneBeingRenamedName()),
                      "lane"
                    )}
                    onChange={(newValue) => setNewLaneName(newValue)}
                    onConfirm={renameLane}
                    onCancel={() => {
                      setNewLaneName(null);
                      setLaneBeingRenamedName(null);
                    }}
                  />
                ) : (
                  <LaneName
                    name={lane}
                    count={getCardsFromLane(lane).length}
                    onRenameBtnClick={() => startRenamingLane(lane)}
                    onCreateNewCardBtnClick={() => createNewCard(lane)}
                    onDelete={() => deleteLane(lane)}
                    onDeleteCards={() => handleDeleteCardsByLane(lane)}
                  />
                )
              }
            >
              <For each={getCardsFromLane(lane)}>
                {(card) => (
                  <Card
                    name={card.name}
                    tags={card.tags}
                    onClick={() => setSelectedCard(card)}
                    headerSlot={
                      cardBeingRenamed()?.name === card.name ? (
                        <NameInput
                          value={newCardName()}
                          errorMsg={validateName(
                            newCardName(),
                            cards()
                              .filter(
                                (card) => card.name !== cardBeingRenamed().name
                              )
                              .map((card) => card.name),
                            "card"
                          )}
                          onChange={(newValue) => setNewCardName(newValue)}
                          onConfirm={renameCard}
                          onCancel={() => {
                            setNewCardName(null);
                            setCardBeingRenamed(null);
                          }}
                        />
                      ) : (
                        <CardName
                          name={card.name}
                          hasContent={!!card.content}
                          onRenameBtnClick={() => startRenamingCard(card)}
                          onDelete={() => deleteCard(card)}
                          onClick={() => setSelectedCard(card)}
                        />
                      )
                    }
                  />
                )}
              </For>
            </Lane>
          )}
        </For>
      </main>
      <Show when={!!selectedCard()}>
        <ExpandedCard
          name={selectedCard().name}
          content={selectedCard().content}
          tags={selectedCard().tags}
          tagsOptions={tagsOptions()}
          onClose={() => setSelectedCard(null)}
          onContentChange={(value) =>
            debounceChangeCardContent(value, selectedCard().id)
          }
          onTagColorChange={handleTagColorChange}
          onNameChange={handleOnSelectedCardNameChange}
          getErrorMsg={(newName) =>
            validateName(
              newName,
              cards()
                .filter((card) => card.name !== selectedCard().name)
                .map((card) => card.name),
              "card"
            )
          }
          disableImageUpload={false}
        />
      </Show>
    </>
  );
}

export default App;
