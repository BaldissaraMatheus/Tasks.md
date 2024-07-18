import { For } from "solid-js";
import { DragAndDropContainer, DragAndDropTarget, createDragAndDropTarget } from "./drag-and-drop";
import { createStore } from "solid-js/store";

export function Container() {
	const [lanes, setLanes] = createStore([
		{ name: 'a', items: ['1', '2', '3', '4', '5'] },
		{ name: 'b', items: ['6', '7', '8', '9'] },
		{ name: 'c', items: [] },
		{ name: 'd', items: [] },
	]);

	const [dragAndDropTarget, setDragAndDropTarget] = createDragAndDropTarget();

	function handleLanesChange(changedItem) {
		const newLanes = JSON.parse(JSON.stringify(lanes)).filter(item => item.name !== changedItem.id);
		const item = lanes.find(item => item.name === changedItem.id)
		setLanes([
			...newLanes.slice(0, changedItem.index),
			item,
			...newLanes.slice(changedItem.index),
		])
	}

	function handleItemsChange(changedItem) {
		const fromLaneIndex = lanes.findIndex(lane => lane.name === changedItem.from);
		const target = lanes[fromLaneIndex].items.find(item => item === changedItem.id)
		setLanes(fromLaneIndex, 'items', lanes[fromLaneIndex].items.filter(item => item !== changedItem.id));
		const toLaneIndex = lanes.findIndex(lane => lane.name === changedItem.to);
		setLanes(toLaneIndex, 'items', [
			...lanes[toLaneIndex].items.slice(0, changedItem.index),
			target,
			...lanes[toLaneIndex].items.slice(changedItem.index),
		]);
	}

	return (<>
		<DragAndDropContainer
			class="board"
			onChange={changedItem => handleLanesChange(changedItem)}
			dragAndDropTarget={dragAndDropTarget()}
			onDragAndDropTargetChange={setDragAndDropTarget}
		>
			<For each={lanes}>
				{lane => <DragAndDropContainer
					id={lane.name}
					class="container-lane"
					group="cards"
					onChange={changedItem => handleItemsChange(changedItem)}
					dragAndDropTarget={dragAndDropTarget()}
					onDragAndDropTargetChange={setDragAndDropTarget}
				>
					<For each={lane.items}>
						{item => <li class="item" id={item}>{item}</li>}
					</For>
				</DragAndDropContainer>
				}
			</For>
		</DragAndDropContainer>
		<DragAndDropTarget
			debug
			dragAndDropTarget={dragAndDropTarget()}
			onDragAndDropTargetChange={setDragAndDropTarget}
		/>
	</>
	)
}