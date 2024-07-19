import {
	createEffect,
	createSignal,
	onMount,
	onCleanup,
	children,
	createMemo,
	batch,
	Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { useLongPress } from "../utils";

export function createDragAndDropTarget() {
	const initialDragAndDropTarget = {
		originalElement: null,
		top: null,
		left: null,
		cursorDisplacementLeft: null,
		cursorDisplacementTop: null,
		from: null,
		to: null,
	}

	const [dragAndDropTarget, setDragAndDropTarget] = createSignal(initialDragAndDropTarget);
	return [dragAndDropTarget, setDragAndDropTarget];
}

export function DragAndDropTarget(props) {
	const draggableItem = createMemo(prev => {
		if (prev === props.dragAndDropTarget.originalElement) {
			return prev;
		}
		if (!props.dragAndDropTarget.originalElement) {
			return null;
		}
		if (props.dragAndDropTarget.originalElement && prev) {
			return prev;
		}
		const target = props.dragAndDropTarget.originalElement.cloneNode(true);
		const targetComputedStyle = window.getComputedStyle(props.dragAndDropTarget.originalElement);
		target.style.height = targetComputedStyle.height;
		target.style.width = targetComputedStyle.width;
		target.style.opacity = '1';
		target.classList.add('being-dragged');
		if (props.debug) {
			target.style.background = 'red';
		}
		return target;
	})

	function handlePointerMove(e) {
		if (!props.dragAndDropTarget.originalElement) {
			return;
		}
		const itemLeft = Math.max(e.pageX - props.dragAndDropTarget.cursorDisplacementLeft, 0);
		const itemTop = Math.max(e.pageY - props.dragAndDropTarget.cursorDisplacementTop, 0);
		props.onDragAndDropTargetChange({
			...props.dragAndDropTarget,
			left: itemLeft,
			top: itemTop,
		});
	}

	onMount(() => {
		document.addEventListener("mousemove", handlePointerMove);
	});

	onCleanup(() => {
		document.removeEventListener("mousemove", handlePointerMove);
	});

	return (
		<Show when={draggableItem}>
			<div
				style={{
					opacity: draggableItem ? '1' : '0',
					position: "absolute",
					top: `${props.dragAndDropTarget.top}px`,
					left: `${props.dragAndDropTarget.left}px`,
					"z-index": '999'
				}}
			>
				{draggableItem}
			</div>
		</Show>
	)
}

export function DragAndDropContainer(props) {
	const [autoScrollAmount, setAutoScrollAmount] = createSignal(0);
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
		e.preventDefault();
		e.stopPropagation();
		if (props.disabled) {
			return;
		}
		const targetBoundingRect = currentTarget.getBoundingClientRect();
		const cursorDisplacementLeft = e.pageX - targetBoundingRect.left;
		const cursorDisplacementTop = e.pageY - targetBoundingRect.top;
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
		setStartPageCoordinates({ x: e.pageX, y: e.pageY });
	}

	function handleTouchStart(e, currentTarget) {
		handlePointerDown(e, currentTarget);
		handlePointerMove(e);
	}

	function handlePointerMove(e) {
		if (!startPageCoordinates()) {
			return;
		}
		const minimalMovement = 6;
		const diffLeft = Math.abs(e.pageX - startPageCoordinates().x);
		const diffTop = Math.abs(e.pageY - startPageCoordinates().y);
		if (diffLeft <= minimalMovement && diffTop <= minimalMovement) {
			return;
		}
		props.onDragAndDropTargetChange(prev => ({
			...prev,
			...targetBeforeMoving(),
		}));
		props.dragAndDropTarget.originalElement.style.opacity = '0';
		setTargetBeforeMoving(null);
		setStartPageCoordinates(null);
	}

	function handlePointerUp(e) {
		setTargetBeforeMoving(null);
		setStartPageCoordinates(null);
		if (!props.dragAndDropTarget.originalElement
			|| !sortedItemsIds
			|| props.dragAndDropTarget.to !== props.id
		) {
			return;
		}
		const index = sortedItemsIds
			.findIndex(id => id === props.dragAndDropTarget.originalElement.id);
		props.onChange({
			id: props.dragAndDropTarget.originalElement.id,
			from: props.dragAndDropTarget.from,
			to: props.dragAndDropTarget.to,
			index
		});
		props.onDragAndDropTargetChange(prev => ({ ...prev, originalElement: null }))
		setAutoScrollAmount(0);
		containerRef.style[paddingProperty()] = '';
	}

	function updateChildrenElements() {
		const itemLength = props.dragAndDropTarget?.[lengthProperty()];
		if (!itemLength) {
			return;
		}
		if (sortedItemsIds.length > items().length) {
			const newItem = props.dragAndDropTarget.originalElement.cloneNode(true);
			newItem.style.opacity = '0';
			newItem.style['z-index'] = '0';
			items().push(newItem);
		}
		items().forEach(item => {
			const itemIndex = items()
				.findIndex(itemToFindIndex => itemToFindIndex.id === item.id)
			const sortedItemIndex = sortedItemsIds.findIndex(id => id === item.id)
			let translateToNewPosition = (sortedItemIndex - itemIndex) * itemLength
			if (sortedItemIndex < itemIndex) {
				translateToNewPosition -= gap();
			}
			if (sortedItemIndex > itemIndex) {
				translateToNewPosition += gap();
			}
			if (flexDirection() === 'row') {
				item.style.translate = `${translateToNewPosition}px 0`
			} else {
				item.style.translate = `0 ${translateToNewPosition}px`
			}
			if (item.id === props.dragAndDropTarget.originalElement?.id) {
				item.style.opacity = '0';
			}
		});
	}

	function sortItems(direction) {
		let targetPosition = props.dragAndDropTarget[positionProperty()]
			+ containerRef[scrollProperty()]
			+ props.dragAndDropTarget[lengthProperty()] * 0.5 * direction;
		const forIndexStart = direction === 1 ? 0 : sortedItemsIds.length - 1;
		const checkForCondition = i => direction === 1 ? i < sortedItemsIds.length - 1 : i > 0;
		const forIndexIncrement = direction;
		const aIndexIncrement = direction === 1 ? 0 : -1;
		const bIndexIncrement = aIndexIncrement + 1;
		for (let index = forIndexStart; checkForCondition(index); index += forIndexIncrement) {
			let prevItemPosition = positions()[index + aIndexIncrement];
			let currItemPosition = positions()[index + bIndexIncrement];
			if (sortedItemsIds[index + aIndexIncrement] === props.dragAndDropTarget.originalElement.id) {
				prevItemPosition = targetPosition;
			}
			if (sortedItemsIds[index + bIndexIncrement] === props.dragAndDropTarget.originalElement.id) {
				currItemPosition = targetPosition;
			}
			if (currItemPosition < prevItemPosition) {
				const tempItem = sortedItemsIds[index + aIndexIncrement];
				batch(() => {
					setSortedItemsIds(index + aIndexIncrement, sortedItemsIds[index + bIndexIncrement]);
					setSortedItemsIds(index + bIndexIncrement, tempItem);
				});
			}
		}
	}

	function autoScroll(
		setAutoScrollAmount,
		directionProperty
	) {
		if (!autoScrollAmount()) {
			return;
		}
		const scrollLengthProperty = flexDirection === 'row' ? 'scrollWidth' : 'scrollHeight';
		const maxScroll = containerRef[scrollLengthProperty] - containerRef[clientLengthProperty()];
		if (autoScrollAmount() > 0 && containerRef[scrollProperty()] >= maxScroll) {
			setAutoScrollAmount(0);
			return;
		}
		if (autoScrollAmount() < 0 && containerRef[scrollProperty()] <= 0) {
			setAutoScrollAmount(0);
			return;
		}
		const autoScrollAmountMultiplier = 4;
		containerRef.scrollBy({ [directionProperty]: autoScrollAmount() * autoScrollAmountMultiplier });
		if (!props.dragAndDropTarget.originalElement) {
			return;
		}
		sortItems(-1);
		setTimeout(() => {
			autoScroll(
				setAutoScrollAmount,
				directionProperty
			)
		}, 7);
	}

	onMount(() => {
		document.addEventListener("mouseup", handlePointerUp);
	});

	onCleanup(() => {
		document.removeEventListener("mouseup", handlePointerUp);
	});

	// setup signals, runs when items container ref changes
	createEffect(() => {
		const containerComputedStyle = window.getComputedStyle(containerRef);
		const computedGap = containerComputedStyle.gap;
		const gapIsInteger = /[0-9]*px|em|rem|%|vh|vw|vmin|vmax|ex|ch|cm|mm|in/.test(computedGap);
		const gapIntergerValue = gapIsInteger ? Number(containerComputedStyle.gap.slice(0, -'px'.length)) : 0;
		setGap(gapIntergerValue);
		const flexDirection = containerComputedStyle.flexDirection;
		setFlexDirection(flexDirection);
		setPositionProperty(flexDirection === 'row' ? 'left' : 'top');
		setPaddingProperty(flexDirection === 'row' ? 'paddingLeft' : 'paddingTop');
		setLengthProperty(flexDirection === 'row' ? 'width' : 'height');
		setScrollProperty(flexDirection === 'row' ? 'scrollLeft' : 'scrollTop');
		setClientLengthProperty(flexDirection === 'row' ? 'clientWidth' : 'clientHeight');
		setContainerStartPos(containerRef.getBoundingClientRect()[positionProperty()]);
		containerRef.removeEventListener('mousemove', handlePointerMove);
		containerRef.addEventListener('mousemove', handlePointerMove);
	});

	const [onLongPressStart, onLongPressEnd] = useLongPress(handleTouchStart, 500)

	// add event listeners to dom items, runs when items change
	createEffect(() => {
		const handleLongPress = e => onLongPressStart(e, e.currentTarget);
		const handleMouseDown = e => handlePointerDown(e, e.currentTarget);
		items().forEach(item => {
			item.removeEventListener('mousedown', handleMouseDown);
			item.addEventListener('mousedown', handleMouseDown);
			item.removeEventListener('touchstart', handleLongPress);
			item.addEventListener('touchstart', handleLongPress);
			item.removeEventListener('mouseup', onLongPressEnd);
			item.addEventListener('mouseup', onLongPressEnd);
			item.removeEventListener('touchend', onLongPressEnd);
			item.addEventListener('touchend', onLongPressEnd);
			item.style.opacity = '1';
			item.style.translate = '';
		})
		setSortedItemsIds([])
	});

	// update dragAndDropTarget.to, runs when target top or left changes 
	createEffect(prev => {
		if (!props.dragAndDropTarget.originalElement
				|| prev === JSON.stringify(props.dragAndDropTarget)
				|| props.dragAndDropTarget.group !== props.group
			) {
			return JSON.stringify(props.dragAndDropTarget);
		}
		if (props.id !== props.dragAndDropTarget.to) {
			setSortedItemsIds(sortedItemsIds.filter(id => id !== props.dragAndDropTarget.originalElement.id));
			return JSON.stringify(props.dragAndDropTarget);
		}
		if (props.id !== props.dragAndDropTarget.from) {
			const endPadding = flexDirection === 'row' ? 'paddingRight' : 'paddingBottom';
			containerRef.style[endPadding] = `${props.dragAndDropTarget[lengthProperty()]}px`;
		}
		if (!sortedItemsIds.length) {
			const newSortedItemsIds = items()
				.map(item => item.id)
				.filter(id => id !== props.dragAndDropTarget.originalElement.id)
			setSortedItemsIds(newSortedItemsIds)
		}
		if (!sortedItemsIds.some(id => id === props.dragAndDropTarget.originalElement.id)) {
			const targetId = props.dragAndDropTarget.originalElement.id;
			setSortedItemsIds(sortedItemsIds.length, targetId);
			const containerStartPadding = window.getComputedStyle(containerRef)[paddingProperty()];
			const containerStartPaddingIntValue = Number(containerStartPadding.slice(0, -2));
			const firstItemPosition = containerStartPos() + containerStartPaddingIntValue;
			let lastPosition = firstItemPosition;
			const newPositions = [];
			sortedItemsIds.forEach((id, i) => {
				if (i === 0) {
					newPositions.push(lastPosition);
					return;
				}
				const prevItem = items().find(item => item.id === id);
				const prevItemHeight = id === props.dragAndDropTarget.originalElement.id
					? props.dragAndDropTarget[lengthProperty()]
					: prevItem.getBoundingClientRect()[lengthProperty()];
				const newPosition = lastPosition + prevItemHeight + gap();
				lastPosition = newPosition;
				newPositions.push(newPosition);
				return;
			});
			setPositions(newPositions)
		}
		let direction;
		if (JSON.parse(prev).originalElement !== null) {
			direction = Math.sign(props.dragAndDropTarget[positionProperty()] - JSON.parse(prev)[positionProperty()]);
		}
		sortItems(direction || -1);
		return JSON.stringify(props.dragAndDropTarget);
	});

	// update dom items, runs when sortedItemsIds change
	createEffect(prev => {
		if (prev === JSON.stringify(sortedItemsIds)) {
			return JSON.stringify(sortedItemsIds);
		}
		if (sortedItemsIds.length) {
			updateChildrenElements();
		}
		return JSON.stringify(sortedItemsIds);
	}, '[]');

	// update dragAndDropTarget.to, runs when target top or left changes 
	createEffect(prev => {
		if (!props.dragAndDropTarget.originalElement) {
			return;
		}
		if (![null, props.id].includes(props.dragAndDropTarget.to)) {
			return;
		}
		if (props.dragAndDropTarget.group !== props.group) {
			return;
		}
		const outerDirection = flexDirection() === 'row' ? 'top' : 'left';
		const outerClientLength = flexDirection() === 'row' ? 'clientHeight' : 'clientWidth';
		if (prev === props.dragAndDropTarget[outerDirection]) {
			return prev;
		}
		const containerEdgeStart = containerRef.getBoundingClientRect()[outerDirection];
		const containerEdgeEnd = containerRef.getBoundingClientRect()[outerDirection] + containerRef[outerClientLength];
		const isBeforeEndEdge = props.dragAndDropTarget[outerDirection] + props.dragAndDropTarget.originalElement[outerClientLength] / 2 <= containerEdgeEnd;
		const isAfterStartEdge = props.dragAndDropTarget[outerDirection] + props.dragAndDropTarget.originalElement[outerClientLength] / 2 > containerEdgeStart;
		const isWithinBounds = isBeforeEndEdge && isAfterStartEdge;
		if (isWithinBounds) {
			props.onDragAndDropTargetChange(prev => ({
				...prev,
				to: props.id,
			}));
			return props.dragAndDropTarget[outerDirection];
		}
		if (props.dragAndDropTarget.to === props.id) {
			props.onDragAndDropTargetChange(prev => ({
				...prev,
				to: null,
			}));
		}
		return props.dragAndDropTarget[outerDirection];
	});

	// update autoScrollAmount, runs when target top or left changes
	createEffect(prev => {
		if (!props.dragAndDropTarget.originalElement) {
			return;
		}
		if (prev === props.dragAndDropTarget[positionProperty()]) {
			return prev;
		}
		const isSameGroup = props.dragAndDropTarget.group === props.group;
		if (isSameGroup && props.dragAndDropTarget.to !== props.id) {
			return;
		}
		const isDescendant = containerRef.contains(props.dragAndDropTarget.originalElement)
		if (!isDescendant && !isSameGroup) {
			return;
		}
		const itemLength = props.dragAndDropTarget.originalElement.clientHeight;
		const maxScroll =  containerRef[clientLengthProperty()] - containerRef[scrollProperty()];
		let newAutoScrollAmount = 0;
		const containerEndPos = containerStartPos() + containerRef[clientLengthProperty()];
		if (props.dragAndDropTarget[positionProperty()]
			&& containerRef[scrollProperty()] < maxScroll
			&& (props.dragAndDropTarget[positionProperty()] + itemLength / 2) >= containerEndPos
		) {
			newAutoScrollAmount = 1;
		} else if (props.dragAndDropTarget[positionProperty()] <= containerStartPos() && containerRef[scrollProperty()] > 0) {
			newAutoScrollAmount = -1;
		}
		if (autoScrollAmount() !== newAutoScrollAmount) {
			setAutoScrollAmount(newAutoScrollAmount)
			autoScroll(
				setAutoScrollAmount,
				positionProperty()
			);
		}
		return props.dragAndDropTarget[positionProperty()];
	});

	return <ul
		class={props.class}
		id={props.id}
		ref={(el) => {
			containerRef = el;
		}}
		style={{ position: 'relative' }}
		draggable
	>
		{items()}
	</ul>
}