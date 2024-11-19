import { MaybeArray, PreHandler, type SingletonBase } from '../../../types'
import { mergeType } from '../../../types/mergeType'

export default class OnRequest {
	[x: string]: any

	/**
	 * ### request | Life cycle event
	 * Called on every new request is accepted
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .onRequest(({ method, url }) => {
	 *         saveToAnalytic({ method, url })
	 *     })
	 * ```
	 */
	onRequest(
		handler: MaybeArray<
			PreHandler<
				mergeType,
				{
					decorator: SingletonBase['decorator']
					store: SingletonBase['store']
					derive: {}
					resolve: {}
				}
			>
		>
	) {
		this.on('request', handler as any)

		return this
	}
}
