import { ElysiaCustomStatusResponse } from '../../../error'
import {
	DefinitionBase,
	EphemeralType,
	ExcludeElysiaResponse,
	HookContainer,
	LifeCycleType,
	MaybePromise,
	MergeSchema,
	MetadataBase,
	Prettify,
	RouteBase,
	SingletonBase
} from '../../../types'
import { Context } from '../../../context'
import type { Elysia } from '../../Elysia'

export default class Resolve<
	const in out BasePath extends string = '',
	const in out Scoped extends boolean = false
> {
	[x: string]: any

	/**
	 * Derive new property for each request with access to `Context`.
	 *
	 * If error is thrown, the scope will skip to handling error instead.
	 *
	 * ---
	 * @example
	 * new Elysia()
	 *     .state('counter', 1)
	 *     .derive(({ store }) => ({
	 *         increase() {
	 *             store.counter++
	 *         }
	 *     }))
	 */
	resolve<
		const Resolver extends
			| Record<string, unknown>
			| ElysiaCustomStatusResponse<any, any, any>,
		const Type extends LifeCycleType
	>(
		options: { as?: Type },
		resolver: (
			context: Prettify<
				Context<
					MergeSchema<
						EphemeralType['schema'],
						MergeSchema<
							EphemeralType['schema'],
							MetadataBase['schema']
						>
					>,
					SingletonBase &
						('global' extends Type
							? {
									derive: Partial<EphemeralType['derive']>
									resolve: Partial<EphemeralType['resolve']>
								}
							: 'scoped' extends Type
								? {
										derive: EphemeralType['derive'] &
											Partial<EphemeralType['derive']>
										resolve: EphemeralType['resolve'] &
											Partial<EphemeralType['resolve']>
									}
								: {
										derive: EphemeralType['derive']
										resolve: EphemeralType['resolve']
									})
				>
			>
		) => MaybePromise<Resolver | void>
	): Type extends 'global'
		? Elysia<
				BasePath,
				Scoped,
				{
					decorator: SingletonBase['decorator']
					store: SingletonBase['store']
					derive: SingletonBase['derive']
					resolve: Prettify<
						SingletonBase['resolve'] &
							ExcludeElysiaResponse<Resolver>
					>
				},
				DefinitionBase,
				MetadataBase,
				RouteBase,
				EphemeralType,
				EphemeralType
			>
		: Type extends 'scoped'
			? Elysia<
					BasePath,
					Scoped,
					SingletonBase,
					DefinitionBase,
					MetadataBase,
					RouteBase,
					{
						derive: EphemeralType['derive']
						resolve: Prettify<
							EphemeralType['resolve'] &
								ExcludeElysiaResponse<Resolver>
						>
						schema: EphemeralType['schema']
					},
					EphemeralType
				>
			: Elysia<
					BasePath,
					Scoped,
					SingletonBase,
					DefinitionBase,
					MetadataBase,
					RouteBase,
					EphemeralType,
					{
						derive: EphemeralType['derive']
						resolve: Prettify<
							EphemeralType['resolve'] &
								ExcludeElysiaResponse<Resolver>
						>
						schema: EphemeralType['schema']
					}
				>

	resolve<
		const Resolver extends
			| Record<string, unknown>
			| ElysiaCustomStatusResponse<any, any, any>
			| void
	>(
		resolver: (
			context: Prettify<
				Context<
					MergeSchema<
						EphemeralType['schema'],
						MergeSchema<
							EphemeralType['schema'],
							MetadataBase['schema']
						>
					>,
					SingletonBase & {
						derive: EphemeralType['derive']
						resolve: EphemeralType['resolve']
					},
					BasePath
				>
			>
		) => MaybePromise<Resolver | void>
	): Elysia<
		BasePath,
		Scoped,
		SingletonBase,
		DefinitionBase,
		MetadataBase,
		RouteBase,
		EphemeralType,
		{
			derive: EphemeralType['derive']
			resolve: Prettify<
				EphemeralType['resolve'] & ExcludeElysiaResponse<Resolver>
			>
			schema: EphemeralType['schema']
		}
	>

	resolve(
		optionsOrResolve: { as?: LifeCycleType } | Function,
		resolve?: Function
	) {
		if (!resolve) {
			resolve = optionsOrResolve as any
			optionsOrResolve = { as: 'local' }
		}

		const hook: HookContainer = {
			subType: 'resolve',
			fn: resolve!
		}

		return this.onBeforeHandle(optionsOrResolve as any, hook as any) as any
	}
}
