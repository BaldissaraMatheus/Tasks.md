import serveStatic from 'serve-static'

// https://github.com/vitejs/vite/discussions/7374#discussioncomment-4013950
export default () => ({
  name: 'general-assets',
  configureServer(server) {
		if (process.env.NODE_ENV === 'development') {
			return;
		}
    server.middlewares.use(serveStatic('public', { index: true }))
  }
})
