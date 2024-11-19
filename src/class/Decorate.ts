import {
	ContextAppendType,
	DefinitionBase,
	EphemeralType,
	MetadataBase,
	Reconcile,
	RouteBase,
	SingletonBase
} from '../../types'
import type { Elysia } from '../Elysia'
import { mergeDeep } from '../../utils'

export default class Decorate {
	[x: string]: any

	/**
	 * ### decorate
	 * Define custom method to `Context` accessible for all handler
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .decorate('getDate', () => Date.now())
	 *     .get('/', (({ getDate }) => getDate())
	 * ```
	 */
	decorate<
		const BasePath extends string,
		const Scoped extends boolean,
		const Name extends string,
		const Value
	>(
		name: Name,
		value: Value
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: Reconcile<
				SingletonBase['decorator'],
				{
					[name in Name]: Value
				}
			>
			store: SingletonBase['store']
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	decorate<
		const BasePath extends string,
		const Scoped extends boolean,
		const NewDecorators extends Record<string, unknown>
	>(
		decorators: NewDecorators
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: Reconcile<SingletonBase['decorator'], NewDecorators>
			store: SingletonBase['store']
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	decorate<
		const BasePath extends string,
		const Scoped extends boolean,
		const NewDecorators extends Record<string, unknown>
	>(
		mapper: (decorators: SingletonBase['decorator']) => NewDecorators
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: NewDecorators
			store: SingletonBase['store']
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	decorate<
		const BasePath extends string,
		const Scoped extends boolean,
		const Type extends ContextAppendType,
		const Name extends string,
		const Value
	>(
		options: { as: Type },
		name: Name,
		value: Value
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: Reconcile<
				SingletonBase['decorator'],
				{
					[name in Name]: Value
				},
				Type extends 'override' ? true : false
			>
			store: SingletonBase['store']
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	decorate<
		const BasePath extends string,
		const Scoped extends boolean,
		const Type extends ContextAppendType,
		const NewDecorators extends Record<string, unknown>
	>(
		options: { as: Type },
		decorators: NewDecorators
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: Reconcile<
				SingletonBase['decorator'],
				NewDecorators,
				Type extends 'override' ? true : false
			>
			store: SingletonBase['store']
			derive: SingletonBase['derive']
			resolve: SingletonBase['resolve']
		},
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	/**
	 * ### decorate
	 * Define custom method to `Context` accessible for all handler
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .decorate('getDate', () => Date.now())
	 *     .get('/', (({ getDate }) => getDate())
	 * ```
	 */
	decorate(
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
					if (name in this.SingletonBase.decorator)
						this.SingletonBase.decorator[name] = mergeDeep(
							this.SingletonBase.decorator[name] as any,
							value!,
							{
								override: as === 'override'
							}
						)
					else this.SingletonBase.decorator[name] = value

					return this
				}

				if (value === null) return this

				this.SingletonBase.decorator = mergeDeep(
					this.SingletonBase.decorator,
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
						!(name in this.SingletonBase.decorator)
					)
						this.SingletonBase.decorator[name] = value
				} else
					this.SingletonBase.decorator = value(
						this.SingletonBase.decorator
					)

				return this as any

			default:
				if (
					as === 'override' ||
					!(name in this.SingletonBase.decorator)
				)
					this.SingletonBase.decorator[name] = value

				return this
		}
	}
}
