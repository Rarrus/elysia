import { ElysiaCustomStatusResponse } from '../../../error'
import type { Context } from '../../../context'
import type {
	ExcludeElysiaResponse,
	HookContainer,
	LifeCycleType,
	MaybePromise,
	MergeSchema,
	MetadataBase,
	Prettify,
	SingletonBase
} from '../../../types'
import type { Elysia } from '../../Elysia'

export default class MapResolve<const in out BasePath extends string = ''> {
	[on: string]: any

	mapResolve<
		const NewResolver extends
			| Record<string, unknown>
			| ElysiaCustomStatusResponse<any, any, any>
	>(
		mapper: (
			context: Context<
				MergeSchema<
					MetadataBase['schema'],
					MergeSchema<
						EphemeralType['schema'],
						EphemeralType['schema']
					>
				>,
				SingletonBase & {
					derive: EphemeralType['derive']
					resolve: EphemeralType['resolve']
				},
				BasePath
			>
		) => MaybePromise<NewResolver | void>
	): Omit<Elysia, 'Ephemeral'> & {
		derive: EphemeralType['derive']
		resolve: ExcludeElysiaResponse<NewResolver>
		schema: EphemeralType['schema']
	}

	mapResolve<
		const NewResolver extends
			| Record<string, unknown>
			| ElysiaCustomStatusResponse<any, any, any>,
		const Type extends LifeCycleType
	>(
		options: { as?: Type },
		mapper: (
			context: Context<
				MergeSchema<
					MetadataBase['schema'],
					MergeSchema<
						EphemeralType['schema'],
						EphemeralType['schema']
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
		) => MaybePromise<NewResolver | void>
	): Type extends 'global'
		? Omit<Elysia, 'Singleton'> & {
				decorator: SingletonBase['decorator']
				store: SingletonBase['store']
				derive: SingletonBase['derive']
				resolve: ExcludeElysiaResponse<NewResolver>
			}
		: Type extends 'scoped'
			? Omit<Elysia, 'Volatile'> & {
					derive: EphemeralType['derive']
					resolve: Prettify<
						EphemeralType['resolve'] &
							ExcludeElysiaResponse<NewResolver>
					>
					schema: EphemeralType['schema']
				}
			: Omit<Elysia, 'Ephemeral'> & {
					derive: EphemeralType['derive']
					resolve: Prettify<
						EphemeralType['resolve'] &
							ExcludeElysiaResponse<NewResolver>
					>
					schema: EphemeralType['schema']
				}

	mapResolve(
		optionsOrResolve: Function | { as?: LifeCycleType },
		mapper?: Function
	) {
		if (!mapper) {
			mapper = optionsOrResolve as any
			optionsOrResolve = { as: 'local' }
		}

		const hook: HookContainer = {
			subType: 'mapResolve',
			fn: mapper!
		}

		return this.onBeforeHandle(optionsOrResolve as any, hook as any) as any
	}
}
