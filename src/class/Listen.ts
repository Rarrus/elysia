import { ListenCallback } from '../../types'
import type { Elysia } from '../Elysia'
import { isNumericString } from '../../utils'
import { Serve } from 'bun'
import { isProduction } from '../../error'
import { websocket } from '../../ws'

export default class Listen {
	[x: string]: any

	/**
	 * ### listen
	 * Assign current instance to port and start serving
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .get("/", () => 'hi')
	 *     .listen(3000)
	 * ```
	 */
	listen = (
		options: string | number | Partial<Serve>,
		callback?: ListenCallback
	) => {
		if (typeof Bun === 'undefined')
			throw new Error(
				'.listen() is designed to run on Bun only. If you are running Elysia in other environment please use a dedicated plugin or export the handler via Elysia.fetch'
			)

		this.compile()

		if (typeof options === 'string') {
			if (!isNumericString(options))
				throw new Error('Port must be a numeric value')

			options = parseInt(options)
		}

		const fetch = this.fetch

		const serve =
			typeof options === 'object'
				? ({
						development: !isProduction,
						reusePort: true,
						...(this.config.serve || {}),
						...(options || {}),

						static: this.router.static.http.static,
						websocket: {
							...(this.config.websocket || {}),
							...(websocket || {})
						},
						fetch,
						error: this.outerErrorHandler
					} as Serve)
				: ({
						development: !isProduction,
						reusePort: true,
						...(this.config.serve || {}),

						static: this.router.static.http.static,
						websocket: {
							...(this.config.websocket || {}),
							...(websocket || {})
						},
						port: options,
						fetch,
						error: this.outerErrorHandler
					} as Serve)

		this.server = Bun?.serve(serve)

		for (let i = 0; i < this.event.start.length; i++)
			this.event.start[i].fn(this)

		if (callback) callback(this.server!)

		process.on('beforeExit', () => {
			if (this.server) {
				this.server.stop()
				this.server = null

				for (let i = 0; i < this.event.stop.length; i++)
					this.event.stop[i].fn(this)
			}
		})

		this.promisedModules.then(() => {
			Bun?.gc(false)
		})

		return this
	}
}
