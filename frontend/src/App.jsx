import {
  createSignal,
  For,
  Show,
  onMount,
  createMemo,
  createEffect,
  createResource,
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
import { BulkOperationsToolbar } from "./components/bulk-operations-toolbar";
import { makePersisted } from "@solid-primitives/storage";
import { DragAndDrop } from "./components/drag-and-drop";
import { useLocation, useNavigate } from "@solidjs/router";
import { v7 } from "uuid";
import { addTagToContent, removeTagFromContent, setDueDateInContent, getTagsFromContent } from "./card-content-utils";
import "./stylesheets/index.css";
import { KeyboardNavigationDialog } from "./components/keyboard-navigation-dialog";

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
  const [filteredTag, setFilteredTag] = makePersisted(createSignal(null), {
    storage: localStorage,
    name: "filteredTag",
  });
  const [tagsOptions, setTagsOptions] = createSignal([]);
  const [laneBeingRenamedName, setLaneBeingRenamedName] = createSignal(null);
  const [newLaneName, setNewLaneName] = createSignal(null);
  const [cardBeingRenamed, setCardBeingRenamed] = createSignal(null);
  const [newCardName, setNewCardName] = createSignal(null);
  const [viewMode, setViewMode] = makePersisted(createSignal("regular"), {
    storage: localStorage,
    name: "viewMode",
  });
  const [renderUID, setRenderUID] = createSignal(v7());
  const [selectionMode, setSelectionMode] = createSignal(false);
  const [selectedCards, setSelectedCards] = createSignal(new Set());
  const [focusedCardId, setFocusedCardId] = createSignal(null);
  const [focusedLaneIndex, setFocusedLaneIndex] = createSignal(null);
  const [hasAutoFocusedFirstCard, setHasAutoFocusedFirstCard] = createSignal(false);
  const [showHelpDialog, setShowHelpDialog] = createSignal(false);
  const location = useLocation();
  const navigate = useNavigate();
  let mainContainerRef;

  const basePath = createMemo(() => {
    if ((import.meta.env.BASE_URL || "").endsWith("/")) {
      return import.meta.env.BASE_URL.substring(
        0,
        import.meta.env.BASE_URL.length - 1
      );
    }
    return import.meta.env.BASE_URL || "";
  });

  const board = createMemo(() => {
    let { pathname } = location || "";
    if (pathname.endsWith(".md") || pathname.endsWith(".md/")) {
      const pathnameParts = pathname.split("/").filter((item) => !!item);
      pathnameParts.pop();
      const concatenatedName = pathnameParts
        .join("/")
        .substring(basePath().length, pathname.length);
      if (!concatenatedName) {
        return "";
      }
      return "/" + concatenatedName;
    }
    if (pathname.endsWith("/")) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    if (basePath() !== "/") {
      pathname = pathname.substring(basePath().length, pathname.length);
    }
    return pathname;
  });

  const selectedCardName = createMemo(() => {
    let pathname = location.pathname;
    if (location.pathname.endsWith("/")) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    const cardName = pathname.endsWith(".md") ? pathname.split("/").at(-1) : "";
    return cardName;
  });

  const selectedCard = createMemo(() => {
    const decodedCardName = decodeURIComponent(selectedCardName())
    const card = cards().find(
      (card) => `${card.name}.md` === decodedCardName
    );
    return card;
  });

  function fetchTitle() {
    if (!board()) {
      return fetch(`${api}/title`).then((res) => res.text());
    }
    const boardSplit = board().split("/");
    return decodeURIComponent(boardSplit.at(-1));
  }

  const [title] = createResource(fetchTitle);

  function getTagBackgroundCssColor(tagColor) {
    const backgroundColorNumber = RegExp("[0-9]").exec(`${tagColor || "1"}`)[0];
    const backgroundColor = `var(--color-alt-${backgroundColorNumber})`;
    return backgroundColor;
  }

  async function fetchData() {
    const resourcesReq = fetch(`${api}/resource${board()}`, {
      method: "GET",
      mode: "cors",
    }).then((res) => res.json());
    const tagsReq = fetch(`${api}/tags${board()}`, {
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
    const sortReq = fetch(`${api}/sort${board()}`, {
      method: "GET",
    }).then((res) => res.json());
    const [remoteTagOptions, resources, manualSort] = await Promise.all([
      tagsReq,
      resourcesReq,
      sortReq,
    ]);

    const lanesFromApi = resources.map((resource) => resource.name);
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
    const currentTagsWithoutDuplicates = currentTags.filter(
      (tag, index, arr) =>
        arr.findIndex((duplicatedTag) => {
          return duplicatedTag.toLowerCase() === tag.toLowerCase();
        }) === index
    );
    const localTagNames = currentTagsWithoutDuplicates;
    const tagsWithColors = localTagNames.map((tagName) => {
      const remoteTag = remoteTagOptions.find((tag) => tag.name === tagName);
      const tagColor =
        remoteTag?.backgroundColor ||
        getTagBackgroundCssColor(pickTagColorIndexBasedOnHash(tagName));
      return {
        name: tagName,
        backgroundColor: tagColor,
      };
    });
    setTagsOptions(tagsWithColors);

    newCards = newCards
      .map((card) => {
        const newCard = structuredClone(card);
        const cardTagsNames = getTagsByCardContent(card.content) || [];
        newCard.tags = tagsWithColors.filter((tagOption) =>
          cardTagsNames.includes(tagOption.name)
        );
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
      setRenderUID(v7());
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

  function updateTagColors(mapTagToColor) {
    return fetch(`${api}/tags${board()}`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapTagToColor),
    });
  }

  async function changeCardContent(newContent) {
    const newCards = structuredClone(cards());
    if (!selectedCard()) {
      return;
    }
    const newCardIndex = structuredClone(
      newCards.findIndex(
        (card) =>
          card.name === selectedCard().name && card.lane === selectedCard().lane
      )
    );
    const newCard = newCards[newCardIndex];
    newCard.content = newContent;
    await fetch(
      `${api}/resource${board()}/${encodeURIComponent(newCard.lane)}/${encodeURIComponent(newCard.name)}.md`,
      {
        method: "PATCH",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      }
    );
    const remoteTagOptions = await fetch(`${api}/tags${board()}`, {
      method: "GET",
      mode: "cors",
    }).then((res) =>
      res.json().then((resJson) => {
        return Object.entries(resJson).map((entry) => ({
          name: entry[0],
          backgroundColor: entry[1],
        }));
      })
    );
    const cardTags = getTagsByCardContent(newContent);
    const cardTagsWithoutDuplicates = cardTags.filter(
      (tag, index, arr) =>
        arr.findIndex((duplicatedTag) => {
          return duplicatedTag.toLowerCase() === tag.toLowerCase();
        }) === index
    );
    const cardTagOptions = cardTagsWithoutDuplicates.map((tagName) => {
      const remoteTagOption = remoteTagOptions.find(option => option.name === tagName);
      const tagColor = remoteTagOption?.backgroundColor || getTagBackgroundCssColor(
        pickTagColorIndexBasedOnHash(tagName)
      );
      return {
        name: tagName,
        backgroundColor: tagColor,
      };
    });
    newCard.tags = cardTagOptions;
    newCard.lastUpdated = new Date().toISOString();
    const dueDateStringMatch = newCard.content.match(/\[due:(.*?)\]/);
    newCard.dueDate = dueDateStringMatch?.length ? dueDateStringMatch[1] : "";
    newCards[newCardIndex] = newCard;
    setCards(newCards);
    const localTagOptions = cardTagOptions.filter((tag) => !tagsOptions().some(remoteTag => remoteTag.name === tag.name))
    const allTagOptions = [...tagsOptions(), ...localTagOptions];
    setTagsOptions(allTagOptions);
    navigate(`${basePath()}${board()}/${encodeURIComponent(newCard.name)}.md`);
  }

  // Use shared utility function for getting tags
  const getTagsByCardContent = getTagsFromContent;

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
    const newCardName = v7();
    await fetch(`${api}/resource${board()}/${encodeURIComponent(lane)}/${encodeURIComponent(newCardName)}.md`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFile: true }),
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
    fetch(`${api}/resource${board()}/${encodeURIComponent(card.lane)}/${encodeURIComponent(card.name)}.md`, {
      method: "DELETE",
      mode: "cors",
    });
    const cardsWithoutDeletedCard = newCards.filter(
      (cardToFind) => cardToFind.name !== card.name
    );
    setCards(cardsWithoutDeletedCard);
  }

  function moveCardToLane(card, newLane) {
    // Move card to a different lane (used for keyboard shortcuts) by reusing
    // the existing handleCardsSortChange logic used by drag-and-drop.
    const targetLaneCards = cards().filter((c) => c.lane === newLane);
    const targetIndex = targetLaneCards.length;

    handleCardsSortChange({
      id: `card-${card.name}`,
      from: `lane-content-${card.lane}`,
      to: `lane-content-${newLane}`,
      index: targetIndex,
    });

    // Keep focus on the moved card
    setTimeout(() => {
      document.getElementById(`card-${card.name}`)?.focus();
    }, 50);
  }

  function moveCardInLane(card, direction) {
    // Move card up or down within its current lane by delegating to
    // handleCardsSortChange so that ordering logic is centralized.
    const laneCards = cards().filter((c) => c.lane === card.lane);
    const currentIndex = laneCards.findIndex((c) => c.name === card.name);

    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= laneCards.length) return;

    handleCardsSortChange({
      id: `card-${card.name}`,
      from: `lane-content-${card.lane}`,
      to: `lane-content-${card.lane}`,
      index: newIndex,
    });

    // Keep focus on the moved card
    setTimeout(() => {
      document.getElementById(`card-${card.name}`)?.focus();
    }, 50);
  }

  async function createNewLane() {
    const newLanes = structuredClone(lanes());
    const newName = v7();
    await fetch(`${api}/resource${board()}/${encodeURIComponent(newName)}`, {
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
    fetch(`${api}/resource${board()}/${encodeURIComponent(laneBeingRenamedName())}`, {
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
    fetch(`${api}/resource${board()}/${encodeURIComponent(lane)}`, {
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
      const tagNameA = a.tags?.[0]?.name || '';
      const tagNameB = b.tags?.[0]?.name || '';
      return sortDirection() === "asc"
        ? tagNameA.localeCompare(tagNameB)
        : tagNameB.localeCompare(tagNameA);
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
    renameCard(selectedCard().name, newName);
    navigate(`${basePath()}${board()}/${encodeURIComponent(newName)}.md`);
  }

  function handleDeleteCardsByLane(lane) {
    const cardsToDelete = cards().filter((card) => card.lane === lane);
    for (const card of cardsToDelete) {
      fetch(`${api}/resource${board()}/${encodeURIComponent(lane)}/${encodeURIComponent(card.name)}.md`, {
        method: "DELETE",
        mode: "cors",
      });
    }
    const cardsToKeep = cards().filter((card) => card.lane !== lane);
    setCards(cardsToKeep);
  }

  // Bulk operations functions
  function toggleCardSelection(cardKey, isSelected) {
    const newSelected = new Set(selectedCards());
    if (isSelected) {
      newSelected.add(cardKey);
    } else {
      newSelected.delete(cardKey);
    }
    setSelectedCards(newSelected);
  }

  function clearSelection() {
    setSelectedCards(new Set());
  }

  function getCardKey(card) {
    return `${card.lane}/${card.name}`;
  }

  // Get tags that exist on selected cards (for remove tags dropdown)
  const tagsOnSelectedCards = createMemo(() => {
    const selectedCardsList = cards().filter((card) =>
      selectedCards().has(getCardKey(card))
    );

    const allTagsOnSelected = new Set();
    selectedCardsList.forEach((card) => {
      const cardTags = getTagsFromContent(card.content || "");
      cardTags.forEach((tag) => allTagsOnSelected.add(tag));
    });

    return Array.from(allTagsOnSelected);
  });

  async function bulkDeleteCards() {
    const cardsToDelete = cards().filter((card) =>
      selectedCards().has(getCardKey(card))
    );

    // Delete all selected cards using existing API
    const deletePromises = cardsToDelete.map((card) =>
      fetch(`${api}/resource${board()}/${encodeURIComponent(card.lane)}/${encodeURIComponent(card.name)}.md`, {
        method: "DELETE",
        mode: "cors",
      })
    );

    await Promise.all(deletePromises);

    // Update local state
    const remainingCards = cards().filter(
      (card) => !selectedCards().has(getCardKey(card))
    );
    setCards(remainingCards);
    clearSelection(); // Clear after delete since cards are gone
  }

  async function bulkAddTags(tagName) {
    const cardsToUpdate = cards().filter((card) =>
      selectedCards().has(getCardKey(card))
    );

    // Add tag to each selected card using shared utility function
    const updatePromises = cardsToUpdate.map(async (card) => {
      const content = card.content || "";
      const currentTags = getTagsFromContent(content);

      // Skip if card already has this tag
      if (currentTags.some((t) => t.toLowerCase() === tagName.toLowerCase())) {
        return;
      }

      const newContent = addTagToContent(content, tagName);

      return fetch(`${api}/resource${board()}/${encodeURIComponent(card.lane)}/${encodeURIComponent(card.name)}.md`, {
        method: "PATCH",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
    });

    await Promise.all(updatePromises);
    await fetchData();
    // Keep selection to allow chaining operations
  }

  async function bulkRemoveTags(tagName) {
    const cardsToUpdate = cards().filter((card) =>
      selectedCards().has(getCardKey(card))
    );

    // Remove tag from each selected card using shared utility function
    const updatePromises = cardsToUpdate.map(async (card) => {
      const content = card.content || "";
      const currentTags = getTagsFromContent(content);

      // Skip if card doesn't have this tag
      if (!currentTags.some((t) => t.toLowerCase() === tagName.toLowerCase())) {
        return;
      }

      const newContent = removeTagFromContent(content, tagName);

      return fetch(`${api}/resource${board()}/${encodeURIComponent(card.lane)}/${encodeURIComponent(card.name)}.md`, {
        method: "PATCH",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
    });

    await Promise.all(updatePromises);
    await fetchData();
    // Keep selection to allow chaining operations
  }

  async function bulkSetDueDate(dueDate) {
    const cardsToUpdate = cards().filter((card) =>
      selectedCards().has(getCardKey(card))
    );

    // Set due date for each selected card using shared utility function
    const updatePromises = cardsToUpdate.map(async (card) => {
      const content = card.content || "";
      const newContent = setDueDateInContent(content, dueDate);

      return fetch(`${api}/resource${board()}/${encodeURIComponent(card.lane)}/${encodeURIComponent(card.name)}.md`, {
        method: "PATCH",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
    });

    await Promise.all(updatePromises);
    await fetchData();
    // Keep selection to allow chaining operations
  }

  function renameCard(oldName, newName) {
    const newCards = structuredClone(cards());
    const newCardIndex = newCards.findIndex((card) => card.name === oldName);
    const newCard = newCards[newCardIndex];
    const newCardNameWithoutSpaces = newName.trim();
    fetch(`${api}/resource${board()}/${encodeURIComponent(newCard.lane)}/${encodeURIComponent(newCard.name)}.md`, {
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
    // Restore focus to the renamed card
    setTimeout(() => {
      setFocusedCardId(newCardNameWithoutSpaces);
      document.getElementById(`card-${newCardNameWithoutSpaces}`)?.focus();
    }, 50);
  }

  async function updateTagColorFromExpandedCard(tagColor) {
    const allTagsColors = tagsOptions().reduce(
      (prev, tag) => ({
        ...prev,
        [tag.name]: tag.backgroundColor,
      }),
      {}
    );
    const newTagColors = {
      ...allTagsColors,
      ...tagColor,
    };
    await updateTagColors(newTagColors);
    await fetchData();
    const newCardIndex = structuredClone(
      cards().findIndex(
        (card) =>
          card.name === selectedCard().name && card.lane === selectedCard().lane
      )
    );
    navigate(`${basePath()}${board()}/${encodeURIComponent(cards()[newCardIndex].name)}.md`);
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
    if (/[<>:%"/\\|?*]/g.test(newName)) {
      return `The new name cannot have any of the following chracters: <>:%"/\\|?*`;
    }
    if (newName.endsWith(".md")) {
      return "Name must not end with .md";
    }
    if (newName === "_api") {
      return 'Name "_api" is prohibited';
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
    if (selectedCard()) {
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
    fetch(`${api}/sort${board()}`, {
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
    const updatedLanes = [
      ...newLanes.slice(0, changedLane.index),
      lane,
      ...newLanes.slice(changedLane.index),
    ];
    setLanes(updatedLanes);

    // If a lane was focused, keep focus on the moved lane by index
    const newIndex = updatedLanes.findIndex((l) => l === lane);
    if (newIndex !== -1) {
      setFocusedLaneIndex(newIndex);
      setTimeout(() => {
        document.getElementById(`lane-${lane}`)?.focus();
      }, 50);
    }
  }

  function handleCardsSortChange(changedCard) {
    const cardName = changedCard.id.slice("card-".length);
    const oldIndex = cards().findIndex((card) => card.name === cardName);
    const card = cards()[oldIndex];
    const newCardLane = changedCard.to.slice("lane-content-".length);
    fetch(`${api}/resource${board()}/${encodeURIComponent(card.lane)}/${encodeURIComponent(cardName)}.md`, {
      method: "PATCH",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newPath: `${board()}/${newCardLane}/${cardName}.md`,
      }),
    });
    card.lane = newCardLane;
    const newCards = lanes().flatMap((lane) => {
      let laneCards = cards().filter(
        (card) => card.lane === lane && card.name !== cardName
      );
      if (lane === newCardLane) {
        laneCards = [
          ...laneCards.slice(0, changedCard.index),
          card,
          ...laneCards.slice(changedCard.index),
        ];
      }
      return laneCards;
    });
    setCards(newCards);

    // Keep focus on the moved card so keyboard navigation works after
    // drag-and-drop and keyboard-based moves.
    setFocusedCardId(cardName);
    setTimeout(() => {
      document.getElementById(`card-${cardName}`)?.focus();
    }, 50);
  }

  const disableCardsDrag = createMemo(() => sort() !== "none" || selectionMode());

  createEffect((prev) => {
    document.body.classList.remove(`view-mode-${prev}`);
    document.body.classList.add(`view-mode-${viewMode()}`);
    return viewMode();
  });

  // Clear selection when exiting selection mode
  createEffect(() => {
    if (!selectionMode()) {
      setSelectedCards(new Set());
    }
  });

  // Auto-focus first card once on initial load for keyboard navigation
  createEffect(() => {
    if (hasAutoFocusedFirstCard()) {
      return;
    }
    // Only auto-focus if no card is currently focused and we have cards
    if (!focusedCardId() && !selectedCard() && lanes().length > 0) {
      setTimeout(() => {
        // Find the first card in the first lane
        const firstLane = lanes()[0];
        const firstLaneCards = getCardsFromLane(firstLane);
        if (firstLaneCards.length > 0) {
          const firstCard = firstLaneCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
          setHasAutoFocusedFirstCard(true);
        }
      }, 100);
    }
  });

  createEffect(() => {
    let focusedElement;
    if (focusedCardId()) {
      focusedElement = document.getElementById(`card-${focusedCardId()}`)?.focus();
    }
    if (focusedLaneIndex()) {
      const laneName = lanes()[focusedLaneIndex()];
      focusedElement = document.getElementById(`lane-${laneName}`)?.focus();
    }
    if (focusedElement) {
      focusedElement.scrollIntoView()
    }
  })

  function handleMainBoardKeyDown(e) {
    // Don't interfere with input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    // Don't interfere when a card is expanded
    if (selectedCard()) {
      return;
    }

    const visibleCards = filteredCards();

    // Allow certain keys to work even when there are no cards
    const allowedKeysWithoutCards = ['n', '?', 'Escape'];
    if (!visibleCards.length && !allowedKeysWithoutCards.includes(e.key)) {
      return;
    }

    switch(e.key) {
      case 'ArrowDown':
      case 'j': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card and get cards in the same lane
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            // Alt+Down: Move card down in the lane
            if (e.altKey) {
              moveCardInLane(currentCard, 'down');
            } else {
              // Normal Down: Navigate to next card in lane
              const currentLaneCards = getCardsFromLane(currentCard.lane);
              const currentIndexInLane = currentLaneCards.findIndex(c => c.name === focusedCardId());
              if (currentIndexInLane < currentLaneCards.length - 1) {
                const nextCard = currentLaneCards[currentIndexInLane + 1];
                setFocusedCardId(nextCard.name);
                document.getElementById(`card-${nextCard.name}`)?.focus();
              }
            }
          }
        } else if (focusedLaneIndex() !== null) {
          // From a focused lane, move Down to the first card in that lane
          const laneName = lanes()[focusedLaneIndex()];
          const laneCards = getCardsFromLane(laneName);
          if (laneCards.length > 0) {
            const firstCard = laneCards[0];
            setFocusedCardId(firstCard.name);
            setFocusedLaneIndex(null);
            document.getElementById(`card-${firstCard.name}`)?.focus();
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'ArrowUp':
      case 'k': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card and get cards in the same lane
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            // Alt+Up: Move card up in the lane
            if (e.altKey) {
              moveCardInLane(currentCard, 'up');
            } else {
              // Normal Up: Navigate to previous card in lane
              const currentLaneCards = getCardsFromLane(currentCard.lane);
              const currentIndexInLane = currentLaneCards.findIndex(c => c.name === focusedCardId());
              if (currentIndexInLane > 0) {
                const prevCard = currentLaneCards[currentIndexInLane - 1];
                setFocusedCardId(prevCard.name);
                document.getElementById(`card-${prevCard.name}`)?.focus();
              } else if (currentIndexInLane === 0) {
                // From the first card in a lane, move focus to the lane itself
                const laneIndex = lanes().indexOf(currentCard.lane);
                if (laneIndex !== -1) {
                  setFocusedCardId(null);
                  setFocusedLaneIndex(laneIndex);
                  setTimeout(() => {
                    document.getElementById(`lane-${currentCard.lane}`)?.focus();
                  }, 0);
                }
              }
            }
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'ArrowRight':
      case 'l': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card from all cards, not just visible filtered ones
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            const currentLaneIndex = lanes().indexOf(currentCard.lane);

            // Alt+Right: Move card to next lane (if exists)
            if (e.altKey) {
              if (currentLaneIndex < lanes().length - 1) {
                const nextLane = lanes()[currentLaneIndex + 1];
                moveCardToLane(currentCard, nextLane);
              }
            } else {
              // Normal Right: Navigate to first card in next non-empty lane
              for (let i = currentLaneIndex + 1; i < lanes().length; i++) {
                const nextLaneCards = getCardsFromLane(lanes()[i]);
                if (nextLaneCards.length > 0) {
                  setFocusedCardId(nextLaneCards[0].name);
                  document.getElementById(`card-${nextLaneCards[0].name}`)?.focus();
                  break;
                }
              }
            }
          }
        } else if (focusedLaneIndex() !== null) {
          const currentLaneIdx = focusedLaneIndex();
          if (e.altKey) {
            // Alt+Right: move the lane itself one position to the right
            if (currentLaneIdx < lanes().length - 1) {
              const laneName = lanes()[currentLaneIdx];
              handleLanesSortChange({
                id: `lane-${laneName}`,
                index: currentLaneIdx + 1,
              });
            }
          } else {
            // Normal Right: move lane focus to the next lane
            if (currentLaneIdx < lanes().length - 1) {
              const nextLaneName = lanes()[currentLaneIdx + 1];
              setFocusedLaneIndex(currentLaneIdx + 1);
              setFocusedCardId(null);
              setTimeout(() => {
                document.getElementById(`lane-${nextLaneName}`)?.focus();
              }, 0);
            }
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'ArrowLeft':
      case 'h': // vim-style navigation
        e.preventDefault();
        if (focusedCardId()) {
          // Find the actual focused card from all cards, not just visible filtered ones
          const currentCard = cards().find(c => c.name === focusedCardId());
          if (currentCard) {
            const currentLaneIndex = lanes().indexOf(currentCard.lane);

            // Alt+Left: Move card to previous lane (if exists)
            if (e.altKey) {
              if (currentLaneIndex > 0) {
                const prevLane = lanes()[currentLaneIndex - 1];
                moveCardToLane(currentCard, prevLane);
              }
            } else {
              // Normal Left: Navigate to first card in previous non-empty lane
              for (let i = currentLaneIndex - 1; i >= 0; i--) {
                const prevLaneCards = getCardsFromLane(lanes()[i]);
                if (prevLaneCards.length > 0) {
                  setFocusedCardId(prevLaneCards[0].name);
                  document.getElementById(`card-${prevLaneCards[0].name}`)?.focus();
                  break;
                }
              }
            }
          }
        } else if (focusedLaneIndex() !== null) {
          const currentLaneIdx = focusedLaneIndex();
          if (e.altKey) {
            // Alt+Left: move the lane itself one position to the left
            if (currentLaneIdx > 0) {
              const laneName = lanes()[currentLaneIdx];
              handleLanesSortChange({
                id: `lane-${laneName}`,
                index: currentLaneIdx - 1,
              });
            }
          } else {
            // Normal Left: move lane focus to the previous lane
            if (currentLaneIdx > 0) {
              const prevLaneName = lanes()[currentLaneIdx - 1];
              setFocusedLaneIndex(currentLaneIdx - 1);
              setFocusedCardId(null);
              setTimeout(() => {
                document.getElementById(`lane-${prevLaneName}`)?.focus();
              }, 0);
            }
          }
        } else if (visibleCards.length > 0) {
          // If nothing focused, focus first card
          const firstCard = visibleCards[0];
          setFocusedCardId(firstCard.name);
          document.getElementById(`card-${firstCard.name}`)?.focus();
        }
        break;

      case 'Enter':
      case 'e': // Edit card
        e.preventDefault();
        if (focusedCardId()) {
          const card = cards().find(c => c.name === focusedCardId());
          if (card) {
            navigate(`${basePath()}${board()}/${card.name}.md`);
          }
        }
        break;

      case 'n': // New card
        e.preventDefault();
        if (lanes().length > 0) {
          const currentCard = focusedCardId()
            ? cards().find(c => c.name === focusedCardId())
            : null;
          const targetLane = currentCard ? currentCard.lane : lanes()[0];
          createNewCard(targetLane);
        }
        break;

      case 'r': // Rename card
        e.preventDefault();
        if (focusedCardId()) {
          const card = cards().find(c => c.name === focusedCardId());
          if (card) {
            startRenamingCard(card);
          }
        }
        break;

      case 'd': // Delete card (with confirmation)
        e.preventDefault();
        if (focusedCardId()) {
          const card = cards().find(c => c.name === focusedCardId());
          if (card && confirm(`Delete card "${card.name}"?`)) {
            // Find cards in the same lane for next focus
            const currentLaneCards = getCardsFromLane(card.lane);
            const currentIndexInLane = currentLaneCards.findIndex(c => c.name === focusedCardId());

            deleteCard(card);

            // Wait for the DOM to update, then focus next or previous card in the same lane
            setTimeout(() => {
              if (currentIndexInLane < currentLaneCards.length - 1) {
                const nextCard = currentLaneCards[currentIndexInLane + 1];
                setFocusedCardId(nextCard.name);
                document.getElementById(`card-${nextCard.name}`)?.focus();
              } else if (currentIndexInLane > 0) {
                const prevCard = currentLaneCards[currentIndexInLane - 1];
                setFocusedCardId(prevCard.name);
                document.getElementById(`card-${prevCard.name}`)?.focus();
              } else {
                setFocusedCardId(null);
              }
            }, 50);
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (showHelpDialog()) {
          setShowHelpDialog(false);
        } else {
          setFocusedCardId(null);
          setFocusedLaneIndex(null);
          mainContainerRef?.focus();
        }
        break;

      case '?': // Help
        e.preventDefault();
        setShowHelpDialog(true);
        break;
    }
  }

  return (
    <div
      ref={(el) => mainContainerRef = el}
      tabIndex="-1"
      onKeyDown={handleMainBoardKeyDown}
      style={{ outline: 'none', height: '100%', display: 'flex', 'flex-direction': 'column' }}
    >
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
        selectionMode={selectionMode()}
        onSelectionModeChange={setSelectionMode}
      />
      <Show when={selectionMode()}>
        <BulkOperationsToolbar
          selectedCount={selectedCards().size}
          onDelete={bulkDeleteCards}
          onAddTags={bulkAddTags}
          onRemoveTags={bulkRemoveTags}
          onSetDueDate={bulkSetDueDate}
          onClearSelection={clearSelection}
          tagsOptions={tagsOptions().map((option) => option.name)}
          tagsOnSelectedCards={tagsOnSelectedCards()}
        />
      </Show>
      {title() ? <h1 class="app-title">{title()}</h1> : <></>}
      <DragAndDrop.Provider>
        <DragAndDrop.Container class={`lanes`} onChange={handleLanesSortChange}>
          <For each={lanes()}>
            {(lane, index) => (
              <div
                class="lane"
                id={`lane-${lane}`}
                tabIndex={0}
                onFocus={() => {
                  setFocusedLaneIndex(index());
                  setFocusedCardId(null);
                }}
              >
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
                        disableDrag={disableCardsDrag()}
                        selectionMode={selectionMode()}
                        isSelected={selectedCards().has(getCardKey(card))}
                        onSelectionChange={(isSelected) =>
                          toggleCardSelection(getCardKey(card), isSelected)
                        }
                        onFocus={() => {
                          setFocusedCardId(card.name);
                          setFocusedLaneIndex(null);
                        }}
                        onClick={() => {
                          if (!selectionMode()) {
                            let cardUrl = basePath();
                            if (board()) {
                              cardUrl += `${board()}`;
                            }
                            cardUrl += `/${encodeURIComponent(card.name)}.md`;
                            navigate(cardUrl);
                          }
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
                                      card.name !== cardBeingRenamed()?.name
                                  )
                                  .map((card) => card.name),
                                "card"
                              )}
                              onChange={(newValue) => setNewCardName(newValue)}
                              onConfirm={() =>
                                renameCard(
                                  cardBeingRenamed()?.name,
                                  newCardName()
                                )
                              }
                              onCancel={() => {
                                const cardName = cardBeingRenamed()?.name;
                                setNewCardName(null);
                                setCardBeingRenamed(null);
                                // Restore focus to the card
                                setTimeout(() => {
                                  if (cardName) {
                                    setFocusedCardId(cardName);
                                    document.getElementById(`card-${cardName}`)?.focus();
                                  }
                                }, 50);
                              }}
                            />
                          ) : (
                            <CardName
                              name={card.name}
                              hasContent={!!card.content}
                              onRenameBtnClick={() => startRenamingCard(card)}
                              onDelete={() => deleteCard(card)}
                              onClick={() =>
                                navigate(
                                  `${basePath()}${board()}/${encodeURIComponent(card.name)}.md`
                                )
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
      <Show when={renderUID()} keyed>
        <Show when={selectedCard()}>
          <ExpandedCard
            name={selectedCard().name}
            content={selectedCard().content}
            tags={selectedCard().tags || []}
            tagsOptions={tagsOptions()}
            onClose={() => {
              const cardName = selectedCard().name;
              navigate(`${basePath()}${board()}` || "/");
              // Restore focus to the card after navigation
              setTimeout(() => {
                setFocusedCardId(cardName);
                const cardElement = document.getElementById(`card-${cardName}`);
                if (cardElement) {
                  cardElement.focus();
                  cardElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                }
              }, 50);
            }}
            onContentChange={(value) =>
              debounceChangeCardContent(value, selectedCard().id)
            }
            onTagColorChange={updateTagColorFromExpandedCard}
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
            board={board()}
            lane={selectedCard()?.lane}
          />
        </Show>
      </Show>
      <Show when={showHelpDialog()}>
        <KeyboardNavigationDialog onClose={() => setShowHelpDialog(false)} />
      </Show>
    </div>
  );
}

export default App;
