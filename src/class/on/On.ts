import {
	HookContainer,
	LifeCycleStore,
	LifeCycleType,
	MaybeArray
} from '../../../types'
import { asHookType, fnToContainer } from '../../../utils'
import { sucrose } from '../../../sucrose'

export default class On {
	[x: string]: any

	/**
	 * ### on
	 * Syntax sugar for attaching life cycle event by name
	 *
	 * Does the exact same thing as `.on[Event]()`
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .on('error', ({ code }) => {
	 *         if(code === "NOT_FOUND")
	 *             return "Path not found :("
	 *     })
	 * ```
	 */

	on<Event extends keyof LifeCycleStore>(
		type: Event,
		handlers: MaybeArray<
			Extract<LifeCycleStore[Event], HookContainer[]>[0]['fn']
		>
	): this

	on<const Event extends keyof LifeCycleStore>(
		options: { as?: LifeCycleType },
		type: Event,
		handlers: MaybeArray<Extract<LifeCycleStore[Event], Function[]>[0]>
	): this

	on(
		optionsOrType: { as?: LifeCycleType } | string,
		typeOrHandlers: MaybeArray<Function | HookContainer> | string,
		handlers?: MaybeArray<Function | HookContainer>
	): this {
		let type: keyof LifeCycleStore

		switch (typeof optionsOrType) {
			case 'string':
				type = optionsOrType as any
				handlers = typeOrHandlers as any

				break

			case 'object':
				type = typeOrHandlers as any

				if (
					!Array.isArray(typeOrHandlers) &&
					typeof typeOrHandlers === 'object'
				)
					handlers = typeOrHandlers

				break
		}

		if (Array.isArray(handlers)) handlers = fnToContainer(handlers)
		else {
			if (typeof handlers === 'function')
				handlers = [
					{
						fn: handlers
					}
				]
			else handlers = [handlers!]
		}

		const handles = handlers as HookContainer[]

		for (const handle of handles)
			handle.scope =
				typeof optionsOrType === 'string'
					? 'local'
					: (optionsOrType?.as ?? 'local')

		if (type !== 'trace')
			sucrose(
				{
					[type]: handles.map((x) => x.fn)
				},
				this.inference
			)

		for (const handle of handles) {
			const fn = asHookType(handle, 'global', { skipIfHasType: true })
			this.event[type].push(fn as any)
		}

		return this.event
	}
}
