import {
	createEffect,
	createSignal,
	onMount,
	onCleanup,
	children,
	createMemo,
	batch,
	Show,
	createContext,
	useContext,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useLongPress } from "../utils";

const DragAndDropContext = createContext();

function Provider(props) {
	const initialDragAndDropTarget = {
		originalElement: null,
		top: null,
		left: null,
		cursorDisplacementLeft: null,
		cursorDisplacementTop: null,
		from: null,
		to: null,
	};
	const [dragAndDropTarget, setDragAndDropTarget] = createSignal(initialDragAndDropTarget);

	return (
		<DragAndDropContext.Provider value={[dragAndDropTarget, setDragAndDropTarget]}>
			{props.children}
		</DragAndDropContext.Provider>
	);
}

function getPageCoordinatesFromMouseOrTouchEvent(e) {
	const pageX = e.changedTouches ? e.changedTouches[0].pageX : e.pageX;
	const pageY = e.changedTouches ? e.changedTouches[0].pageY : e.pageY;
	return { pageX, pageY };
}

/**
 *
 * @typedef {Object} dragAndDropTarget()
 * @property {number} left
 * @property {number} top
 * @property {number} cursorDisplacementLeft
 * @property {number} cursorDisplacementTop
 * @property {string} from Id of parent element of the target
 * @property {string} to Id of the new target parent
 */

/**
 * @callback OnDragAndDropTargetChange
 * @param {dragAndDropTarget()} newDragAndDropTarget
 */

function Target() {
	const [dragAndDropTarget, setDragAndDropTarget] = useContext(DragAndDropContext);
	const draggableItem = createMemo((prev) => {
		if (prev === dragAndDropTarget().originalElement) {
			return prev;
		}
		if (!dragAndDropTarget().originalElement) {
			return null;
		}
		if (dragAndDropTarget().originalElement && prev) {
			return prev;
		}
		const target = dragAndDropTarget().originalElement.cloneNode(true);
		const targetComputedStyle = window.getComputedStyle(
			dragAndDropTarget().originalElement,
		);
		target.style.height = targetComputedStyle.height;
		target.style.width = targetComputedStyle.width;
		target.style.opacity = "1";
		target.classList.add("being-dragged");
		return target;
	});

	function handlePointerMove(e) {
		if (!dragAndDropTarget().originalElement) {
			return;
		}
		e.preventDefault();
		const { pageX, pageY } = getPageCoordinatesFromMouseOrTouchEvent(e);
		const itemLeft = pageX - dragAndDropTarget().cursorDisplacementLeft;
		const itemTop = pageY - dragAndDropTarget().cursorDisplacementTop;
		setDragAndDropTarget({
			...dragAndDropTarget(),
			left: itemLeft,
			top: itemTop,
		});
	}

	onMount(() => {
		document.addEventListener("mousemove", handlePointerMove, {
			passive: false,
		});
		document.addEventListener("touchmove", (e) => handlePointerMove(e), {
			passive: false,
		});
	});

	onCleanup(() => {
		document.removeEventListener("mousemove", handlePointerMove);
		document.removeEventListener("touchmove", handlePointerMove);
	});

	return (
		<Show when={draggableItem}>
			<div
				style={{
					opacity: draggableItem ? "1" : "0",
					position: "absolute",
					top: `${dragAndDropTarget().top}px`,
					left: `${dragAndDropTarget().left}px`,
					"z-index": "999",
					"touch-action": "none",
				}}
			>
				{draggableItem}
			</div>
		</Show>
	);
}

/**
 *
 * @param {Object} props
 * @param {string} props.class
 * @param {string} props.group Target group if container is nested
 * @param {string} props.id
 * @param {OnDragAndDropTargetChange} props.onChange
 * @param {boolean} props.disabled
 */
function Container(props) {
	const [dragAndDropTarget, setDragAndDropTarget] = useContext(DragAndDropContext);
	const [autoScrollSign, setAutoScrollSign] = createSignal(0);
	const [sortedItemsIds, setSortedItemsIds] = createStore([]);
	const [positions, setPositions] = createSignal([]);
	const [flexDirection, setFlexDirection] = createSignal(null);
	const [gap, setGap] = createSignal(0);
	const [positionProperty, setPositionProperty] = createSignal(null);
	const [paddingProperty, setPaddingProperty] = createSignal(null);
	const [lengthProperty, setLengthProperty] = createSignal(null);
	const [scrollProperty, setScrollProperty] = createSignal(null);
	const [clientLengthProperty, setClientLengthProperty] = createSignal(null);
	const [containerStartPos, setContainerStartPos] = createSignal(null);
	const [startPageCoordinates, setStartPageCoordinates] = createSignal(null);

	let containerRef;

	const items = children(() => props.children());

	const [targetBeforeMoving, setTargetBeforeMoving] = createSignal(null);

	function handlePointerDown(e, currentTarget) {
		if (e.target.tagName === "INPUT") {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const targetBoundingRect = currentTarget.getBoundingClientRect();
		const { pageX, pageY } = getPageCoordinatesFromMouseOrTouchEvent(e);
		const cursorDisplacementLeft = pageX - targetBoundingRect.left;
		const cursorDisplacementTop = pageY - targetBoundingRect.top;
		const top = targetBoundingRect.top;
		const left = targetBoundingRect.left;
		setTargetBeforeMoving({
			top,
			left,
			cursorDisplacementLeft,
			cursorDisplacementTop,
			originalElement: currentTarget,
			height: targetBoundingRect.height,
			width: targetBoundingRect.width,
			from: props.id,
			to: props.id,
			group: props.group,
		});
		setStartPageCoordinates({ x: pageX, y: pageY });
	}

	function handlePointerMove(e, touch) {
		if (!startPageCoordinates()) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
		const { pageX, pageY } = getPageCoordinatesFromMouseOrTouchEvent(e);
		const diffLeft = Math.abs(pageX - startPageCoordinates().x);
		const diffTop = Math.abs(pageY - startPageCoordinates().y);
		const minMovement = 6;
		if (!touch && diffLeft <= minMovement && diffTop <= minMovement) {
			return;
		}
		if (touch) {
			const maxMovement = 26;
			if (diffLeft > maxMovement || diffTop > maxMovement) {
				setTargetBeforeMoving(null);
				setStartPageCoordinates(null);
				return;
			}
		}
		setDragAndDropTarget((prev) => ({
			...prev,
			...targetBeforeMoving(),
		}));
		dragAndDropTarget().originalElement.style.opacity = "0";
		setTargetBeforeMoving(null);
		setStartPageCoordinates(null);
	}

	const [onLongPressStart, onLongPressEnd] = useLongPress(
		handleTouchStart,
		500,
	);

	function handleTouchStart(e, currentTarget) {
		e.preventDefault();
		handlePointerDown(e, currentTarget);
		handlePointerMove(e, true);
	}

	function handlePointerUp() {
		setTargetBeforeMoving(null);
		setStartPageCoordinates(null);
		if (
			!dragAndDropTarget().originalElement ||
			!sortedItemsIds ||
			dragAndDropTarget().to !== props.id
		) {
			return;
		}
		const index = sortedItemsIds.findIndex(
			(id) => id === dragAndDropTarget().originalElement.id,
		);
		props.onChange({
			id: dragAndDropTarget().originalElement.id,
			from: dragAndDropTarget().from,
			to: dragAndDropTarget().to,
			index,
		});
		setDragAndDropTarget((prev) => ({
			...prev,
			originalElement: null,
		}));
		setAutoScrollSign(0);
		containerRef.style[paddingProperty()] = "";
	}

	function updateChildrenElements() {
		const itemLength = dragAndDropTarget()?.[lengthProperty()];
		if (!itemLength) {
			return;
		}
		if (sortedItemsIds.length > items().length) {
			const newItem = dragAndDropTarget().originalElement.cloneNode(true);
			newItem.style.opacity = "0";
			newItem.style["z-index"] = "0";
			items().push(newItem);
		}
		for (const item of items()) {
			const itemIndex = items().findIndex(
				(itemToFindIndex) => itemToFindIndex.id === item.id,
			);
			const sortedItemIndex = sortedItemsIds.findIndex((id) => id === item.id);
			let translateToNewPosition = (sortedItemIndex - itemIndex) * itemLength;
			if (sortedItemIndex < itemIndex) {
				translateToNewPosition -= gap();
			}
			if (sortedItemIndex > itemIndex) {
				translateToNewPosition += gap();
			}
			if (flexDirection() === "row") {
				item.style.translate = `${translateToNewPosition}px 0`;
			} else {
				item.style.translate = `0 ${translateToNewPosition}px`;
			}
			if (item.id === dragAndDropTarget().originalElement?.id) {
				item.style.opacity = "0";
			}
		}
	}

	function sortItems(direction) {
		const targetPosition =
			dragAndDropTarget()[positionProperty()] +
			containerRef[scrollProperty()] +
			dragAndDropTarget()[lengthProperty()] * 0.5 * direction;
		const forIndexStart = direction === 1 ? 0 : sortedItemsIds.length - 1;
		const checkForCondition = (i) =>
			direction === 1 ? i < sortedItemsIds.length - 1 : i > 0;
		const forIndexIncrement = direction;
		const aIndexIncrement = direction === 1 ? 0 : -1;
		const bIndexIncrement = aIndexIncrement + 1;
		for (
			let index = forIndexStart;
			checkForCondition(index);
			index += forIndexIncrement
		) {
			let prevItemPosition = positions()[index + aIndexIncrement];
			let currItemPosition = positions()[index + bIndexIncrement];
			if (
				sortedItemsIds[index + aIndexIncrement] ===
				dragAndDropTarget().originalElement.id
			) {
				prevItemPosition = targetPosition;
			}
			if (
				sortedItemsIds[index + bIndexIncrement] ===
				dragAndDropTarget().originalElement.id
			) {
				currItemPosition = targetPosition;
			}
			if (currItemPosition < prevItemPosition) {
				const tempItem = sortedItemsIds[index + aIndexIncrement];
				batch(() => {
					setSortedItemsIds(
						index + aIndexIncrement,
						sortedItemsIds[index + bIndexIncrement],
					);
					setSortedItemsIds(index + bIndexIncrement, tempItem);
				});
			}
		}
	}

	function autoScroll(setAutoScrollSign, topOrLeft) {
		if (!autoScrollSign()) {
			containerRef.style["scroll-snap-type"] = "";
			return;
		}
		// TODO get proper maxScroll value
		// const scrollLengthProperty = flexDirection === 'row' ? 'scrollWidth' : 'scrollHeight';
		// const maxScroll = containerRef[scrollLengthProperty] - containerRef[clientLengthProperty()];
		const maxScroll = Number.MAX_SAFE_INTEGER;
		if (autoScrollSign() > 0 && containerRef[scrollProperty()] >= maxScroll) {
			setAutoScrollSign(0);
			containerRef.style["scroll-snap-type"] = "";
			return;
		}
		if (autoScrollSign() < 0 && containerRef[scrollProperty()] <= 0) {
			setAutoScrollSign(0);
			containerRef.style["scroll-snap-type"] = "";
			return;
		}
		const autoScrollAmount = 4;
		containerRef.style["scroll-snap-type"] = "none";
		containerRef.scrollBy({
			[topOrLeft]: autoScrollSign() * autoScrollAmount,
		});
		if (!dragAndDropTarget().originalElement) {
			return;
		}
		sortItems(-1);
		setTimeout(() => {
			autoScroll(setAutoScrollSign, topOrLeft);
		}, 7);
	}

	onMount(() => {
		document.addEventListener("mouseup", handlePointerUp);
		document.addEventListener("touchend", handlePointerUp);
	});

	onCleanup(() => {
		document.removeEventListener("mouseup", handlePointerUp);
		document.removeEventListener("touchend", handlePointerUp);
	});

	function preventDragWhenScrollingWithTouch() {
		onLongPressEnd();
		setStartPageCoordinates(null);
		setTargetBeforeMoving(null);
	}

	// setup signals, runs when items container ref changes
	createEffect(() => {
		const containerComputedStyle = window.getComputedStyle(containerRef);
		const computedGap = containerComputedStyle.gap;
		const gapIsInteger =
			/[0-9]*px|em|rem|%|vh|vw|vmin|vmax|ex|ch|cm|mm|in/.test(computedGap);
		const gapIntergerValue = gapIsInteger
			? Number(containerComputedStyle.gap.slice(0, -"px".length))
			: 0;
		setGap(gapIntergerValue);
		const flexDirection = containerComputedStyle.flexDirection;
		setFlexDirection(flexDirection);
		setPositionProperty(flexDirection === "row" ? "left" : "top");
		setPaddingProperty(flexDirection === "row" ? "paddingLeft" : "paddingTop");
		setLengthProperty(flexDirection === "row" ? "width" : "height");
		setScrollProperty(flexDirection === "row" ? "scrollLeft" : "scrollTop");
		setClientLengthProperty(
			flexDirection === "row" ? "clientWidth" : "clientHeight",
		);
		setContainerStartPos(
			containerRef.getBoundingClientRect()[positionProperty()],
		);
		containerRef.removeEventListener("mousemove", handlePointerMove);
		containerRef.addEventListener("mousemove", handlePointerMove);
		containerRef.removeEventListener("touchmove", handlePointerMove, {
			passive: false,
		});
		containerRef.addEventListener("touchmove", handlePointerMove, {
			passive: false,
		});
		containerRef.removeEventListener(
			"scroll",
			preventDragWhenScrollingWithTouch,
		);
		containerRef.addEventListener("scroll", preventDragWhenScrollingWithTouch);
	});

	function handleContextMenu(e) {
		e.preventDefault();
		e.stopImmediatePropagation();
	}

	// add event listeners to dom items, runs when items change
	createEffect(() => {
		const handleLongPress = (e) => onLongPressStart(e, e.currentTarget);
		const handleMouseDown = (e) => handlePointerDown(e, e.currentTarget);
		for (const item of items()) {
			item.removeEventListener("mousedown", handleMouseDown);
			item.addEventListener("mousedown", handleMouseDown);
			item.removeEventListener("touchstart", handleLongPress);
			item.addEventListener("touchstart", handleLongPress);
			item.removeEventListener("mouseup", onLongPressEnd);
			item.addEventListener("mouseup", onLongPressEnd);
			item.removeEventListener("touchend", onLongPressEnd);
			item.addEventListener("touchend", onLongPressEnd);
			item.removeEventListener("contextmenu", handleContextMenu);
			item.addEventListener("contextmenu", handleContextMenu);
			item.style.opacity = "1";
			item.style.translate = "";
		}
		setSortedItemsIds([]);
		const endPadding =
			flexDirection === "row" ? "paddingRight" : "paddingBottom";
		containerRef.style[endPadding] = "";
	});

	// update dragAndDropTarget().to, runs when target top or left changes
	createEffect((prev) => {
		if (
			!dragAndDropTarget().originalElement ||
			prev === JSON.stringify(dragAndDropTarget()) ||
			dragAndDropTarget().group !== props.group
		) {
			return JSON.stringify(dragAndDropTarget());
		}
		if (props.id !== dragAndDropTarget().to) {
			setSortedItemsIds(
				sortedItemsIds.filter(
					(id) => id !== dragAndDropTarget().originalElement.id,
				),
			);
			return JSON.stringify(dragAndDropTarget());
		}
		if (props.id !== dragAndDropTarget().from) {
			const endPadding =
				flexDirection === "row" ? "paddingRight" : "paddingBottom";
			containerRef.style[endPadding] =
				`${dragAndDropTarget()[lengthProperty()]}px`;
		}
		if (!sortedItemsIds.length) {
			const newSortedItemsIds = items()
				.map((item) => item.id)
				.filter((id) => id !== dragAndDropTarget().originalElement.id);
			setSortedItemsIds(newSortedItemsIds);
		}
		if (
			!sortedItemsIds.some(
				(id) => id === dragAndDropTarget().originalElement.id,
			)
		) {
			const targetId = dragAndDropTarget().originalElement.id;
			setSortedItemsIds(sortedItemsIds.length, targetId);
			const containerStartPadding =
				window.getComputedStyle(containerRef)[paddingProperty()];
			const containerStartPaddingIntValue = Number(
				containerStartPadding.slice(0, -2),
			);
			const firstItemPosition =
				containerStartPos() + containerStartPaddingIntValue;
			let lastPosition = firstItemPosition;
			const newPositions = [];
			sortedItemsIds.forEach((id, i) => {
				if (i === 0) {
					newPositions.push(lastPosition);
					return;
				}
				const prevItem = items().find((item) => item.id === id);
				const prevItemHeight =
					id === dragAndDropTarget().originalElement.id
						? dragAndDropTarget()[lengthProperty()]
						: prevItem.getBoundingClientRect()[lengthProperty()];
				const newPosition = lastPosition + prevItemHeight + gap();
				lastPosition = newPosition;
				newPositions.push(newPosition);
				return;
			});
			setPositions(newPositions);
		}
		let direction;
		if (JSON.parse(prev).originalElement !== null) {
			direction = Math.sign(
				dragAndDropTarget()[positionProperty()] -
					JSON.parse(prev)[positionProperty()],
			);
		}
		sortItems(direction || -1);
		return JSON.stringify(dragAndDropTarget());
	});

	// update dom items, runs when sortedItemsIds change
	createEffect((prev) => {
		if (prev === JSON.stringify(sortedItemsIds)) {
			return JSON.stringify(sortedItemsIds);
		}
		if (sortedItemsIds.length) {
			updateChildrenElements();
		}
		return JSON.stringify(sortedItemsIds);
	}, "[]");

	// update dragAndDropTarget().to, runs when target top or left changes
	createEffect((prev) => {
		if (!dragAndDropTarget().originalElement) {
			return;
		}
		if (![null, props.id].includes(dragAndDropTarget().to)) {
			return;
		}
		if (dragAndDropTarget().group !== props.group) {
			return;
		}
		const outerDirection = flexDirection() === "row" ? "top" : "left";
		const outerClientLength =
			flexDirection() === "row" ? "clientHeight" : "clientWidth";
		if (prev === dragAndDropTarget()[outerDirection]) {
			return prev;
		}
		const containerEdgeStart =
			containerRef.getBoundingClientRect()[outerDirection];
		const containerEdgeEnd =
			containerRef.getBoundingClientRect()[outerDirection] +
			containerRef[outerClientLength];
		const isBeforeEndEdge =
			dragAndDropTarget()[outerDirection] +
				dragAndDropTarget().originalElement[outerClientLength] / 2 <=
			containerEdgeEnd;
		const isAfterStartEdge =
			dragAndDropTarget()[outerDirection] +
				dragAndDropTarget().originalElement[outerClientLength] / 2 >
			containerEdgeStart;
		const isWithinBounds = isBeforeEndEdge && isAfterStartEdge;
		if (isWithinBounds) {
			setDragAndDropTarget((prev) => ({
				...prev,
				to: props.id,
			}));
			return dragAndDropTarget()[outerDirection];
		}
		if (dragAndDropTarget().to === props.id) {
			setDragAndDropTarget((prev) => ({
				...prev,
				to: null,
			}));
		}
		return dragAndDropTarget()[outerDirection];
	});

	// update autoScrollAmount, runs when target top or left changes
	createEffect((prev) => {
		if (!dragAndDropTarget().originalElement) {
			return;
		}
		if (prev === dragAndDropTarget()[positionProperty()]) {
			return prev;
		}
		const isSameGroup = dragAndDropTarget().group === props.group;
		if (isSameGroup && dragAndDropTarget().to !== props.id) {
			return;
		}
		const isDescendant = containerRef.contains(
			dragAndDropTarget().originalElement,
		);
		if (!isDescendant && !isSameGroup) {
			return;
		}
		const itemLength =
			dragAndDropTarget().originalElement[clientLengthProperty()];
		// TODO get proper maxScroll value
		// const scrollLengthProperty = flexDirection === 'row' ? 'scrollWidth' : 'scrollHeight';
		// const maxScroll = containerRef[scrollLengthProperty] - containerRef[scrollProperty()];
		const maxScroll = Number.MAX_SAFE_INTEGER;
		let newAutoScrollAmount = 0;
		const containerEndPos =
			containerStartPos() + containerRef[clientLengthProperty()];
		const autoscrollThreshold = 0.7;
		if (
			dragAndDropTarget()[positionProperty()] &&
			containerRef[scrollProperty()] < maxScroll &&
			dragAndDropTarget()[positionProperty()] +
				itemLength * autoscrollThreshold >=
				containerEndPos
		) {
			newAutoScrollAmount = 1;
		} else if (
			dragAndDropTarget()[positionProperty()] <=
			containerStartPos() - itemLength * (1 - autoscrollThreshold)
		) {
			newAutoScrollAmount = -1;
		}
		if (autoScrollSign() !== newAutoScrollAmount) {
			setAutoScrollSign(newAutoScrollAmount);
			autoScroll(setAutoScrollSign, positionProperty());
		}
		return dragAndDropTarget()[positionProperty()];
	});

	return (
		<ul
			class={props.class}
			id={props.id}
			ref={(el) => {
				containerRef = el;
			}}
			style={{
				position: "relative",
				"touch-action": dragAndDropTarget().originalElement
					? "none"
					: "auto",
			}}
			draggable
		>
			{items()}
		</ul>
	);
}

export const DragAndDrop = {
	Provider,
	Target,
	Container,
}