import {
  createSignal,
  For,
  Show,
  onMount,
  createMemo,
  createEffect,
  createResource,
  onCleanup,
  createUniqueId,
  batch,
} from "solid-js";
import ExpandedCard from "./components/expanded-card";
import { debounce } from "@solid-primitives/scheduled";
import { api } from "./api";
import { LaneName } from "./components/lane-name";
import { NameInput } from "./components/name-input";
import { Header } from "./components/header";
import { Card } from "./components/card";
import { CardName } from "./components/card-name";
import { makePersisted } from "@solid-primitives/storage";
import { DragAndDrop } from "./components/drag-and-drop";
import { useLocation, useNavigate } from "@solidjs/router";
import "./stylesheets/index.css";

function App() {
  const [lanes, setLanes] = createSignal([]);
  const [cards, setCards] = createSignal([]);
  const [sort, setSort] = makePersisted(createSignal("none"), {
    storage: localStorage,
    name: "sort",
  });
  const [sortDirection, setSortDirection] = makePersisted(createSignal("asc"), {
    storage: localStorage,
    name: "sortDirection",
  });
  const [search, setSearch] = createSignal("");
  const [filteredTag, setFilteredTag] = createSignal(null);
  const [tagsOptions, setTagsOptions] = createSignal([]);
  const [laneBeingRenamedName, setLaneBeingRenamedName] = createSignal(null);
  const [newLaneName, setNewLaneName] = createSignal(null);
  const [cardBeingRenamed, setCardBeingRenamed] = createSignal(null);
  const [newCardName, setNewCardName] = createSignal(null);
  const [viewMode, setViewMode] = makePersisted(createSignal("regular"), {
    storage: localStorage,
    name: "viewMode",
  });
  const location = useLocation();
  const navigate = useNavigate();

  const board = createMemo(() => {
    let { pathname } = location || "";
    if (pathname.endsWith(".md") || pathname.endsWith(".md/")) {
      const pathnameParts = pathname.split("/").filter((item) => !!item);
      pathnameParts.pop();
      return pathnameParts.join("/");
    }
    if (pathname.startsWith("/")) {
      pathname = pathname.substring(1);
    }
    if (pathname.endsWith("/")) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    return pathname;
  });

  const selectedCardName = createMemo(() => {
    let pathname = location.pathname;
    if (location.pathname.endsWith("/")) {
      pathname = pathname.substring(0, pathname.length - 1)
    }
    const cardName = pathname.endsWith(".md")
      ? pathname.split("/").at(-1)
      : "";
    return cardName;
  });

  const selectedCard = createMemo(() => {
    return cards().find((card) => `${card.name}.md` === selectedCardName());
  });

  function fetchTitle() {
    return fetch(`${api}/title`).then((res) => res.text());
  }

  const [title] = createResource(fetchTitle);

  function getTagBackgroundCssColor(tagColor) {
    const backgroundColorNumber = RegExp("[0-9]").exec(`${tagColor || "1"}`)[0];
    const backgroundColor = `var(--color-alt-${backgroundColorNumber})`;
    return backgroundColor;
  }

  function getTagsByTagNames(tags, tagNames) {
    return tagNames.map((tagName) => {
      const foundTag = tags.find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
      );
      const backgroundColor = getTagBackgroundCssColor(
        foundTag?.backgroundColor
      );
      return { name: tagName, backgroundColor };
    });
  }

  async function fetchData() {
    // TODO moveo to promise.all
    const resourcesReq = await fetch(`${api}/resource/${board()}`, {
      method: "GET",
      mode: "cors",
    }).then((res) => res.json());
    const tagsReq = fetch(`${api}/tags/${board()}`, {
      method: "GET",
      mode: "cors",
    }).then((res) =>
      res.json().then((resJson) =>
        Object.entries(resJson).map((entry) => ({
          name: entry[0],
          backgroundColor: entry[1],
        }))
      )
    );
    const [tagsColors, resources] = await Promise.all([tagsReq, resourcesReq]);

    const lanesFromApi = resources.map((resource) => resource.name);
    const lanesSortedReq = fetch(`${api}/sort/${board()}`, {
      method: "GET",
    }).then((res) => res.json());
    const [manualSort] = await Promise.all([lanesSortedReq]);
    const lanesSortedKeys = Object.keys(manualSort);
    const newLanes = lanesFromApi.toSorted(
      (a, b) => lanesSortedKeys.indexOf(a) - lanesSortedKeys.indexOf(b)
    );

    let newCards = resources
      .map((resource) =>
        resource.files.map((file) => ({ ...file, lane: resource.name }))
      )
      .flat();

    const currentTags = newCards
      .map((card) => getTagsByCardContent(card.content))
      .reduce((prev, curr) => [...prev, ...curr], []);
    const remoteTags = Object.keys(tagsColors);
    const newTags = [...currentTags, ...remoteTags].filter(
      (tag, index, arr) =>
        arr.findIndex((duplicatedTag) => {
          return duplicatedTag.toLowerCase() === tag.toLowerCase();
        }) === index
    );
    const tagsWithColors = newTags.map((tag) => {
      const tagColor =
        tagsColors[tag] ||
        getTagBackgroundCssColor(pickTagColorIndexBasedOnHash(tag));
      return {
        name: tag,
        backgroundColor: tagColor,
      };
    });
    setTagsOptions(tagsWithColors);

    newCards = newCards
      .map((card) => {
        const newCard = structuredClone(card);
        const cardTagsNames = getTagsByCardContent(card.content) || [];
        newCard.tags = getTagsByTagNames(tagsColors, cardTagsNames);
        const dueDateStringMatch = newCard.content.match(/\[due:(.*?)\]/);
        newCard.dueDate = dueDateStringMatch?.length
          ? dueDateStringMatch[1]
          : "";
        return newCard;
      })
      .toSorted((a, b) => {
        const indexOfA = manualSort[a.lane]?.indexOf(a.name) || -1;
        const indexOfB = manualSort[b.lane]?.indexOf(b.name) || -1;
        return indexOfA - indexOfB;
      });
    batch(() => {
      setLanes(newLanes);
      setCards(newCards);
    });
  }

  function pickTagColorIndexBasedOnHash(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = value.charCodeAt(i) + ((hash << 5) - hash);
    }
    const tagOptionsLength = 7;
    const colorIndex = Math.abs(hash % tagOptionsLength);
    return colorIndex;
  }

  const debounceChangeCardContent = debounce(
    (newContent) => changeCardContent(newContent),
    250
  );

  function updateTags(newTags) {}

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
    await fetch(
      `${api}/resource/${board()}/${newCard.lane}/${newCard.name}.md`,
      {
        method: "PATCH",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      }
    );
    const newTagsOptions = await fetch(`${api}/tags/${board()}`, {
      method: "GET",
      mode: "cors",
    }).then((res) =>
      res.json().then((resJson) =>
        Object.entries(resJson).map((entry) => ({
          name: entry[0],
          backgroundColor: entry[1],
        }))
      )
    );
    const justAddedTags = newTagsOptions.filter(
      (newTagOption) =>
        !tagsOptions().some((tagOption) => tagOption.name === newTagOption.name)
    );
    const newTagColors = {};
    for (const tag of justAddedTags) {
      const tagColorIndex = pickTagColorIndexBasedOnHash(tag.name);
      const newColor = `var(--color-alt-${tagColorIndex + 1})`;
      newTagColors[tag.name] = newColor;
      const newTagOptionIndex = newTagsOptions.findIndex(
        (newTag) => newTag.name === tag.name
      );
      newTagsOptions[newTagOptionIndex].backgroundColor = newColor;
    }
    await fetch(`${api}/tags/${board()}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTagColors),
    });
    setTagsOptions(newTagsOptions);
    const cardTagsNames = getTagsByCardContent(newContent);
    newCard.tags = getTagsByTagNames(newTagsOptions, cardTagsNames);
    const dueDateStringMatch = newCard.content.match(/\[due:(.*?)\]/);
    newCard.lastUpdated = new Date().toISOString();
    newCard.dueDate = dueDateStringMatch?.length ? dueDateStringMatch[1] : "";
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    navigate(`${board()}/${newCard.name}.md`);
  }

  function getTagsByCardContent(text) {
    const tags = [...text.matchAll(/\[tag:(.*?)\]/g)]
      .map((tagMatch) => tagMatch[1].trim())
      .filter((tag) => tag !== "");
    return tags;
  }

  function handleSortSelectOnChange(e) {
    const value = e.target.value;
    if (value === "none") {
      setSort("none");
      return setSortDirection("asc");
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
    const newCardName = createUniqueId();
    await fetch(`${api}/resource/${board()}/${lane}/${newCardName}.md`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane: newCard.lane }),
    });
    newCard.name = newCardName;
    newCard.lastUpdated = new Date().toISOString();
    newCard.createdAt = new Date().toISOString();
    newCards.unshift(newCard);
    setCards(newCards);
    startRenamingCard(cards()[0]);
  }

  function deleteCard(card) {
    const newCards = structuredClone(cards());
    fetch(`${api}/resource/${board()}/${card.lane}/${card.name}.md`, {
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
    const newName = createUniqueId();
    await fetch(`${api}/resource/${board()}/newName`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
    });
    newLanes.push(newName);
    setLanes(newLanes);
    setNewLaneName(newName);
    setLaneBeingRenamedName(newName);
  }

  function renameLane() {
    console.log("aqui?");
    fetch(`${api}/resource/${board()}/${laneBeingRenamedName()}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPath: `${board()}/${newLaneName()}` }),
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
    fetch(`${api}/resource/${board()}/${lane}`, {
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

  function sortCardsByDue() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return sortDirection() === "asc"
        ? (a.dueDate || "z").localeCompare(b.dueDate || "z")
        : (b.dueDate || "").localeCompare(a.dueDate || "");
    });
  }

  function sortCardsByLastUpdated() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return (b.lastUpdated || "").localeCompare(a.lastUpdated || "");
    });
  }

  function sortCardsByCreatedFirst() {
    const newCards = structuredClone(cards());
    return newCards.sort((a, b) => {
      return (a.createdAt || "").localeCompare(b.createdAt || "");
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
    navigate(`${board()}/${newCard.name}.md`);
  }

  function handleDeleteCardsByLane(lane) {
    const cardsToDelete = cards().filter((card) => card.lane === lane);
    for (const card of cardsToDelete) {
      fetch(`${api}/resource/${board()}/${lane}/${card.name}.md`, {
        method: "DELETE",
        mode: "cors",
      });
    }
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
    fetch(`${api}/resource/${board()}/${newCard.lane}/${newCard.name}.md`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPath: `${board()}/${newCard.lane}/${newCardNameWithoutSpaces}.md`,
      }),
    });
    newCard.name = newCardNameWithoutSpaces;
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    setCardBeingRenamed(null);
  }

  async function handleTagColorChange() {
    await fetchData();
    const newCardIndex = structuredClone(
      cards().findIndex(
        (card) =>
          card.name === selectedCard().name && card.lane === selectedCard().lane
      )
    );
    navigate(`${board()}/${cards()[newCardIndex].name}.md`);
  }

  function validateName(newName, namesList, item) {
    if (newName === null) {
      return null;
    }
    if (newName === "") {
      return `The ${item} must have a name`;
    }
    if (newName.startsWith(".")) {
      return "Cards and lanes with names starting with dot are hidden";
    }
    if (namesList.filter((name) => name === (newName || "").trim()).length) {
      return `There's already a ${item} with that name`;
    }
    if (/[<>:"/\\|?*]/g.test(newName)) {
      return `The new name cannot have any of the following chracters: <>:"/\\|?*`;
    }
    if (newName.endsWith(".md")) {
      return "Name must not end with .md";
    }
    return null;
  }

  function startRenamingLane(lane) {
    setNewLaneName(lane);
    setLaneBeingRenamedName(lane);
  }

  const sortedCards = createMemo(() => {
    if (sort() === "none") {
      return cards();
    }
    if (sort() === "name") {
      return sortCardsByName();
    }
    if (sort() === "tags") {
      return sortCardsByTags();
    }
    if (sort() === "due") {
      return sortCardsByDue();
    }
    if (sort() === "lastUpdated") {
      return sortCardsByLastUpdated();
    }
    if (sort() === "createdFirst") {
      return sortCardsByCreatedFirst();
    }
    return cards();
  });

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
    const url = window.location.href;
    if (!url.match(/\/$/)) {
      window.location.replace(`${url}/`);
    }
    fetchData();
  });

  createEffect(() => {
    if (title()) {
      document.title = title();
    }
  });

  createEffect(() => {
    if (!lanes().length) {
      return;
    }
    const newSortJson = lanes().reduce((prev, curr) => {
      const laneCardNames = cards()
        .filter((card) => card.lane === curr)
        .map((card) => card.name);
      return {
        ...prev,
        [curr]: laneCardNames,
      };
    }, {});
    fetch(`${api}/sort/${board()}`, {
      method: "PUT",
      body: JSON.stringify(newSortJson),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (disableCardsDrag()) {
      return;
    }
  });

  function handleLanesSortChange(changedLane) {
    const lane = lanes().find(
      (lane) => lane === changedLane.id.slice("lane-".length)
    );
    const newLanes = JSON.parse(JSON.stringify(lanes())).filter(
      (newLane) => newLane !== lane
    );
    setLanes([
      ...newLanes.slice(0, changedLane.index),
      lane,
      ...newLanes.slice(changedLane.index),
    ]);
  }

  function handleCardsSortChange(changedCard) {
    const cardLane = changedCard.to.slice("lane-content-".length);
    const cardName = changedCard.id.slice("card-".length);
    fetch(`${api}/cards/${cardName}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane: cardLane }),
    });
    const oldIndex = cards().findIndex((card) => card.name === cardName);
    const newCard = cards()[oldIndex];
    newCard.lane = cardLane;
    const newCards = lanes().flatMap((lane) => {
      let laneCards = cards().filter(
        (card) => card.lane === lane && card.name !== cardName
      );
      if (lane === cardLane) {
        laneCards = [
          ...laneCards.slice(0, changedCard.index),
          newCard,
          ...laneCards.slice(changedCard.index),
        ];
      }
      return laneCards;
    });
    setCards(newCards);
  }

  const disableCardsDrag = createMemo(() => sort() !== "none");

  createEffect((prev) => {
    document.body.classList.remove(`view-mode-${prev}`);
    document.body.classList.add(`view-mode-${viewMode()}`);
    return viewMode();
  });

  return (
    <>
      <Header
        search={search()}
        onSearchChange={setSearch}
        sort={sort() === "none" ? "none" : `${sort()}:${sortDirection()}`}
        onSortChange={handleSortSelectOnChange}
        tagOptions={tagsOptions().map((option) => option.name)}
        filteredTag={filteredTag()}
        onTagChange={handleFilterSelectOnChange}
        onNewLaneBtnClick={createNewLane}
        viewMode={viewMode()}
        onViewModeChange={(e) => setViewMode(e.target.value)}
      />
      {title() ? <h1 class="app-title">{title()}</h1> : <></>}
      <DragAndDrop.Provider>
        <DragAndDrop.Container class={`lanes`} onChange={handleLanesSortChange}>
          <For each={lanes()}>
            {(lane) => (
              <div class="lane" id={`lane-${lane}`}>
                <header class="lane__header">
                  {laneBeingRenamedName() === lane ? (
                    <NameInput
                      value={newLaneName()}
                      errorMsg={validateName(
                        newLaneName(),
                        lanes().filter(
                          (lane) => lane !== laneBeingRenamedName()
                        ),
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
                  )}
                </header>
                <DragAndDrop.Container
                  class="lane__content"
                  group="cards"
                  id={`lane-content-${lane}`}
                  onChange={handleCardsSortChange}
                >
                  <For each={getCardsFromLane(lane)}>
                    {(card) => (
                      <Card
                        name={card.name}
                        tags={card.tags}
                        dueDate={card.dueDate}
                        content={card.content}
                        onClick={() => {
                          navigate(`${board()}/${card.name}.md`);
                        }}
                        headerSlot={
                          cardBeingRenamed()?.name === card.name ? (
                            <NameInput
                              value={newCardName()}
                              errorMsg={validateName(
                                newCardName(),
                                cards()
                                  .filter(
                                    (card) =>
                                      card.name !== cardBeingRenamed().name
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
                              onClick={() =>
                                navigate(`${board()}/${card.name}.md`)
                              }
                            />
                          )
                        }
                      />
                    )}
                  </For>
                </DragAndDrop.Container>
              </div>
            )}
          </For>
        </DragAndDrop.Container>
        <DragAndDrop.Target />
      </DragAndDrop.Provider>
      <Show when={!!selectedCard()}>
        <ExpandedCard
          name={selectedCard().name}
          content={selectedCard().content}
          tags={selectedCard().tags || []}
          tagsOptions={tagsOptions()}
          onClose={() => navigate(board())}
          onContentChange={(value) =>
            debounceChangeCardContent(value, selectedCard().id)
          }
          onTagColorChange={handleTagColorChange}
          onNameChange={handleOnSelectedCardNameChange}
          getNameErrorMsg={(newName) =>
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
