import { createSignal, onMount, onCleanup, For, createEffect } from "solid-js"

export function BoardExample() {
	const [autoScrollLeftAmount, setAutoScrollLeftAmount] = createSignal(0);
	const [autoScrollTopAmount, setAutoScrollTopAmount] = createSignal(0);

	const initialDummy = {
		id: null,
		top: null,
		left: null,
		cursorDisplacementLeft: null,
		cursorDisplacementTop: null,
		element: null,
	}

	const [dummy, setDummy] = createSignal(initialDummy);
	const [items, setItems] = createSignal([
		{ id: 'item', top: 0, left: 250 },
	])

	function handlePointerDown(e) {
		const targetId = 'item';
		const targetRef = document.getElementById(targetId);
		const containerRef = document.getElementById('container');
		const targetBoundingRect = targetRef.getBoundingClientRect();
		const cursorDisplacementLeft = e.pageX - targetBoundingRect.left;
		const cursorDisplacementTop = e.pageY - targetBoundingRect.top;
		const dummyElement = targetRef.cloneNode(true);
		dummyElement.id = 'dummy';
		dummyElement.style.top = '0';
		dummyElement.style.left = '0';
		dummyElement.style.cursor = 'grabbing';
		setDummy({
			id: targetId,
			top: targetBoundingRect.top + containerRef.scrollTop,
			left: targetBoundingRect.left + containerRef.scrollLeft,
			cursorDisplacementLeft: cursorDisplacementLeft,
			cursorDisplacementTop: cursorDisplacementTop,
			element: dummyElement,
		})
	}

	function handlePointerMove(e) {
		if (!dummy().id) {
			return;
		}
		const containerRef = document.getElementById('container');
		const itemsRef = document.getElementById('items');
		const dummyLeftMax = Math.min(e.pageX
			+ containerRef.scrollLeft
			- dummy().cursorDisplacementLeft, itemsRef.clientWidth);
		const dummyLeft = Math.max(dummyLeftMax, 0);
		const dummyTopMax = Math.min(e.pageY
			+ containerRef.scrollTop
			- dummy().cursorDisplacementTop, itemsRef.clientHeight);
		const dummyTop = Math.max(dummyTopMax, 0);
		setDummy({
			...dummy(),
			left: dummyLeft,
			top: dummyTop,
		});
		const dummyEl = document.getElementById('dummy');
		const maxScrollLeft = containerRef.scrollWidth - containerRef.clientWidth;
		const rightEdge = containerRef.clientWidth + containerRef.scrollLeft;
		if (dummy().left
			&& containerRef.scrollLeft < maxScrollLeft
			&& (dummy().left + dummyEl.clientWidth / 2) >= rightEdge) {
			setAutoScrollLeftAmount(1);
		} else if (dummy().left
			&& containerRef.scrollLeft > 0
			&& (dummy().left) <= -dummyEl.clientWidth / 2 + containerRef.scrollLeft) {
			setAutoScrollLeftAmount(-1);
		} else {
			setAutoScrollLeftAmount(0);
		}

		const maxScrollTop = containerRef.scrollHeight - containerRef.clientHeight;
		const bottomEdge = containerRef.clientHeight + containerRef.scrollTop;
		if (dummyTop
			&& containerRef.scrollTop < maxScrollTop
			&& (dummyTop + dummyEl.clientHeight / 2) >= bottomEdge) {
			setAutoScrollTopAmount(1);
		} else if (dummyTop
			&& containerRef.scrollTop > 0
			&& (dummyTop) <= -dummyEl.clientHeight / 2 + containerRef.scrollTop) {
			setAutoScrollTopAmount(-1);
		} else {
			setAutoScrollTopAmount(0);
		}
	}

	function thresholdToContainerDimensions(newValue, dimension) {
		return Math.max(
			Math.min(newValue, dimension), 0
		);
	}

	function autoScroll(
		scrollLength,
		containerClientLength,
		listClientLength,
		scrollValue,
		autoScrollAmount,
		setAutoScrollAmount,
		directionProperty
	) {
		if (!autoScrollAmount()) {
			return;
		}
		const containerRef = document.getElementById('container');
		const maxScroll = scrollLength - containerClientLength;
		if (autoScrollAmount() > 0 && scrollValue >= maxScroll) {
			setAutoScrollAmount(0);
			return;
		}
		if (autoScrollAmount() < 0 && scrollLength <= 0) {
			setScrollAmount(0);
			return;
		}
		containerRef.scrollBy({ [directionProperty]: autoScrollAmount() });
		setDummy(prev => ({
			...prev,
			[directionProperty]: thresholdToContainerDimensions(prev[directionProperty] + autoScrollAmount(), listClientLength)
		}));
		setTimeout(() => {
			autoScroll(
				scrollLength, containerClientLength, listClientLength, scrollValue, autoScrollAmount, setAutoScrollAmount, directionProperty
			)
		}, 5);

	}

	createEffect(() => {
		if (autoScrollLeftAmount()) {
			const containerRef = document.getElementById('container');
			const itemsRef = document.getElementById('items');
			autoScroll(
				containerRef.scrollWidth,
				containerRef.clienthWidth,
				itemsRef.clientWidth,
				containerRef.scrollLeft,
				autoScrollLeftAmount,
				setAutoScrollLeftAmount,
				'left'
			);
		}
	});

	createEffect(() => {
		if (autoScrollTopAmount()) {
			const containerRef = document.getElementById('container');
			const itemsRef = document.getElementById('items');
			autoScroll(
				containerRef.scrollHeight,
				containerRef.clienthHeight,
				itemsRef.clientHeight,
				containerRef.scrollTop,
				autoScrollTopAmount,
				setAutoScrollTopAmount,
				'top'
			);
		}
	});

	function handlePointerUp() {
		if (!dummy()?.id) {
			return;
		}
		const newItems = structuredClone(items());
		const index = items().findIndex(item => item.id === dummy().id);
		newItems[index].left = dummy().left;
		newItems[index].top = dummy().top;
		setItems(newItems)
		setDummy(initialDummy);
		setAutoScrollLeftAmount(0);
		setAutoScrollTopAmount(0);
	}

	onMount(() => {
		document.addEventListener("mousemove", handlePointerMove);
		document.addEventListener("mouseup", handlePointerUp);
	});

	onCleanup(() => {
		document.removeEventListener("mousemove", handlePointerMove);
		document.removeEventListener("mouseup", handlePointerUp);
	});

	return (
		<div id="container" style={{ width: '200px', height: '200px', overflow: 'auto' }}>
			<div
				id="items"
				style={{
					width: "500px",
					height: "500px",
					overflow: "auto",
					background: "chocolate",
					overflow: "auto",
					position: "relative",
				}}
			>
				<For each={items()}>
					{(item) => (
						<div id={item.id}
							style={{
								height: "50px",
								width: "50px",
								position: 'absolute',
								top: `${item.top}px`,
								left: `${item.left}px`,
								background: "burlywood",
								color: "black",
								"user-select": "none",
								transition: "transform 1s",
								opacity: dummy().id === "item" ? 0 : 1,
								cursor: 'grab',
							}}
							onmousedown={(e) => handlePointerDown(e)}
						/>
					)}
				</For>
				<div
					style={{
						position: "absolute",
						top: `${dummy().top}px`,
						left: `${dummy().left}px`,
						display: dummy().id ? 'initial' : 'none',
					}}
				>
					{ dummy().element }
				</div>
			</div>
		</div>
	)
}