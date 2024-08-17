import { handleKeyDown } from "../utils";

/**
 *
 * @param {Object} props
 * @param {string} props.name
 * @param {boolean} props.disableDrag
 * @param {Object[]} props.tags
 * @param {Function} props.onClick
 * @param {JSX.Element} props.headerSlot
 */
export function Card(props) {
	
    // Function to generate hex code based on the tag name
    const generateHexCode = (value) => {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = value.charCodeAt(i) + ((hash << 5) - hash);
        }

        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).slice(-2);
        }

        return color;
    };

    return (
        <div
            role="button"
            id={`card-${props.name}`}
            class={`card ${props.disableDrag ? "card__drag-disabled" : ""}`}
            onKeyDown={(e) => handleKeyDown(e, props.onClick)}
            onClick={props.onClick}
            tabIndex="0"
        >
            <div class="card__toolbar">{props.headerSlot}</div>
            <ul class="tags">
                <For each={props.tags}>
                    {(tag) => {
                        const hexColor = generateHexCode(tag.name);
                        return (
                            <li
                                class="tag"
                                style={{
                                    "background-color": hexColor,
                                    "border-color": hexColor,
                                }}
                            >
                                <h5>{tag.name}</h5>
                            </li>
                        );
                    }}
                </For>
            </ul>
        </div>
    );
}
