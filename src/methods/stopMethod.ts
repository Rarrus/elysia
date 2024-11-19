/**
 * ### stop
 * Stop server from serving
 *
 * ---
 * @example
 * ```typescript
 * const app = new Elysia()
 *     .get("/", () => 'hi')
 *     .listen(3000)
 *
 * // Sometime later
 * app.stop()
 * ```
 *
 * @example
 * ```typescript
 * const app = new Elysia()
 *     .get("/", () => 'hi')
 *     .listen(3000)
 *
 * app.stop(true) // Abruptly any requests inflight
 * ```
 */
const stop = async (
	server?: any,
	event: any,
	closeActiveConnections?: boolean
) => {
	if (!server)
		throw new Error(
			"Elysia isn't running. Call `app.listen` to start the server."
		)
	else {
		server.stop(closeActiveConnections)
		server = null

		if (event.stop.length)
			for (let i = 0; i < event.stop.length; i++) event.stop[i].fn(this)
		return server
	}
}
