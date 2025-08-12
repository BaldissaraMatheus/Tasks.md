let basePath = import.meta.env.DEV
	? `http://localhost:${import.meta.env.VITE_API_PORT}${import.meta.env.BASE_URL || '/'}`
	: `${import.meta.env.BASE_URL || '/'}`
if (basePath.endsWith('/')) {
	basePath = basePath.substring(0, basePath.length - 1);
}
export const api = `${basePath}/_api`;
