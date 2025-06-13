const basePath = import.meta.env.DEV
	? `http://localhost:${import.meta.env.VITE_API_PORT}/`
	: window.location.href;
let subPath = import.meta.env.BASE_URL;
if (!subPath.endsWith('/')) {
	subPath += '/';
}
export const api = `${basePath.at(-1) === "/" ? basePath.substring(0, basePath.length - 1) : `${basePath}`}${subPath}_api`;
console.log({ basePath, api })
