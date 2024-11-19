import { GracefulHandler, MaybeArray } from '../../../types'

export default class OnStop {
	[x: string]: any

	/**
	 * ### stop | Life cycle event
	 * Called after server stop serving request
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .onStop((app) => {
	 *         cleanup()
	 *     })
	 * ```
	 */
	onStop(handler: MaybeArray<GracefulHandler<this >>) {
		this.on('stop', handler as any)
		return this
	}
}
