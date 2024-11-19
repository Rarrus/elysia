import { GracefulHandler, MaybeArray } from '../../../types'

export default class OnStart {
	[x: string]: any

	/**
	 * ### start | Life cycle event
	 * Called after server is ready for serving
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .onStart(({ server }) => {
	 *         console.log("Running at ${server?.url}:${server?.port}")
	 *     })
	 *     .listen(3000)
	 * ```
	 */
	onStart(handler: MaybeArray<GracefulHandler<this>>) {
		this.on('start', handler as any)
		return this
	}
}
