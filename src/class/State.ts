
import type { Elysia } from '../Elysia'
import {
	ContextAppendType,
	DefinitionBase,
	EphemeralType,
	MetadataBase,
	Reconcile,
	RouteBase,
	SingletonBase
} from '../../types'
import { mergeDeep } from '../../utils'

export default class State {
	[x: string]: any

	/**
	 * ### state
	 * Assign global mutatable state accessible for all handler
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .state('counter', 0)
	 *     .get('/', (({ counter }) => ++counter)
	 * ```
	 */
	state<
		const BasePath extends string,
		const Scoped extends boolean,
		const Name extends string | number | symbol,
		Value
	>(
		name: Name,
		value: Value
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: SingletonBase['decorator']
			store: Reconcile<
				SingletonBase['store'],
				{
					[name in Name]: Value
				}
			>
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	state<
		const BasePath extends string,
		const Scoped extends boolean,
		Store extends Record<string, unknown>
	>(
		store: Store
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: SingletonBase['decorator']
			store: Reconcile<SingletonBase['store'], Store>
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	state<
		const BasePath extends string,
		const Scoped extends boolean,
		const Type extends ContextAppendType,
		const Name extends string | number | symbol,
		Value
	>(
		options: { as: Type },
		name: Name,
		value: Value
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: SingletonBase['decorator']
			store: Reconcile<
				SingletonBase['store'],
				{
					[name in Name]: Value
				},
				Type extends 'override' ? true : false
			>
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	state<
		const BasePath extends string,
		const Scoped extends boolean,
		const Type extends ContextAppendType,
		Store extends Record<string, unknown>
	>(
		options: { as: Type },
		store: Store
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: SingletonBase['decorator']
			store: Reconcile<
				SingletonBase['store'],
				Store,
				Type extends 'override' ? true : false
			>
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	state<
		const BasePath extends string,
		const Scoped extends boolean,
		NewStore extends Record<string, unknown>
	>(
		mapper: (decorators: SingletonBase['store']) => NewStore
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: SingletonBase['decorator']
			store: NewStore
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	state(
		options:
			| { as: ContextAppendType }
			| string
			| Record<string, unknown>
			| Function,
		name?:
			| string
			| Record<string, unknown>
			| Function
			| { as: ContextAppendType },
		value?: unknown
	) {
		if (name === undefined) {
			/**
			 * Using either
			 * - decorate({ name: value })
			 */
			value = options
			options = { as: 'append' }
			name = ''
		} else if (value === undefined) {
			/**
			 * Using either
			 * - decorate({ as: 'override' }, { name: value })
			 * - decorate('name', value)
			 */

			// decorate('name', value)
			if (typeof options === 'string') {
				value = name
				name = options
				options = { as: 'append' }
			} else if (typeof options === 'object') {
				// decorate({ as: 'override' }, { name: value })
				value = name
				name = ''
			}
		}

		const { as } = options as { as: ContextAppendType }

		if (typeof name !== 'string') return this

		switch (typeof value) {
			case 'object':
				if (name) {
					if (name in this.SingletonBase.store)
						this.SingletonBase.store[name] = mergeDeep(
							this.SingletonBase.store[name] as any,
							value!,
							{
								override: as === 'override'
							}
						)
					else this.SingletonBase.store[name] = value

					return this
				}

				if (value === null) return this

				this.SingletonBase.store = mergeDeep(
					this.SingletonBase.store,
					value,
					{
						override: as === 'override'
					}
				)

				return this as any

			case 'function':
				if (name) {
					if (
						as === 'override' ||
						!(name in this.SingletonBase.store)
					)
						this.SingletonBase.store[name] = value
				} else
					this.SingletonBase.store = value(this.SingletonBase.store)

				return this as any

			default:
				if (as === 'override' || !(name in this.SingletonBase.store))
					this.SingletonBase.store[name] = value

				return this
		}
	}
}
