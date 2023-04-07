export const api = import.meta.env.DEV ? 'http://localhost:8080/api' : `${window.location.href}api`;
