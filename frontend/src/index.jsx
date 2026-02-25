/* @refresh reload */
import { render } from "solid-js/web";

import App from "./App";
import { Router } from "@solidjs/router";
import { I18nProvider } from "./i18n";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		"Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?",
	);
}

render(() => <I18nProvider><Router root={App}></Router></I18nProvider>, root);
