import {
	LifeCycleType,
	MaybeArray,
	RouteSchema,
	type SingletonBase
} from '../../../types'
import { createTracer, TraceHandler } from '../../../trace'

export default class Trace {
	[x: string]: any

	/**
	 * ### After Handle | Life cycle event
	 * Intercept request **after** main handler is called.
	 *
	 * If truthy value is returned, will be assigned as `Response`
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .onAfterHandle((context, response) => {
	 *         if(typeof response === "object")
	 *             return JSON.stringify(response)
	 *     })
	 * ```
	 */
	trace<const Schema extends RouteSchema>(
		handler: MaybeArray<TraceHandler<Schema, SingletonBase>>
	): this

	trace<const Schema extends RouteSchema>(
		options: { as?: LifeCycleType },
		handler: MaybeArray<TraceHandler<Schema, SingletonBase>>
	): this

	trace(
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>
	) {
		if (!handler) {
			handler = options as MaybeArray<Function>
			options = { as: 'local' }
		}
		if (!Array.isArray(handler)) handler = [handler] as Function[]

		for (const fn of handler)
			this.on(
				options as { as?: LifeCycleType },
				'trace',
				createTracer(fn as any) as any
			)

		return this
	}
}
