import {
	DefinitionBase,
	EphemeralType,
	InputSchema,
	LifeCycleType,
	LocalHook,
	MergeSchema,
	MetadataBase,
	Prettify,
	RouteBase,
	SingletonBase,
	UnwrapRoute
} from '../../../types'
import Elysia, { AnyElysia } from '../../Elysia'
import { cloneInference, mergeDeep, mergeHook } from '../../../utils'
import { SingletonDerRes } from '../../../types/syngletonType'
import { GInterface } from '../../../interface/GInterface'

export default class Guard<
	T extends GInterface
> {
	[x: string]: any

	/**
	 * ### guard
	 * Encapsulate and pass hook into all child handler
	 *
	 * ---
	 * @example
	 * ```typescript
	 * import { t } from 'elysia'
	 *
	 * new Elysia()
	 *     .guard({
	 *          schema: {
	 *              body: t.Object({
	 *                  username: t.String(),
	 *                  password: t.String()
	 *              })
	 *          }
	 *     }, app => app
	 *         .get("/", () => 'Hi')
	 *         .get("/name", () => 'Elysia')
	 *     })
	 * ```
	 */
	guard<
		const LocalSchema extends InputSchema<
			Extract<keyof Definitions['type'], string>
		>,
		const Schema extends MergeSchema<
			UnwrapRoute<LocalSchema, Definitions['type']>,
			Metadata['schema']
		>,
		const Type extends LifeCycleType
	>(
		hook: {
			as: Type
		} & LocalHook<
			LocalSchema,
			Schema,
			SingletonBase & SingletonDerRes,
			Definitions['error'],
			Metadata['macro'],
			BasePath
		>
	): Type extends 'global'
		? Elysia<
				BasePath,
				Scoped,
				{
					decorator: SingletonBase['decorator']
					store: SingletonBase['store']
					derive: SingletonBase['derive']
					resolve: SingletonBase['resolve']
				},
				Definitions,
				{
					schema: Prettify<
						MergeSchema<
							UnwrapRoute<LocalSchema, Definitions['type']>,
							Metadata['schema']
						>
					>
					macro: Metadata['macro']
					macroFn: Metadata['macroFn']
				},
				Routes,
				Ephemeral,
				Volatile
			>
		: Type extends 'scoped'
			? ElysiaCustom & {
					Ephemeral: {
						derive: Ephemeral['derive']
						resolve: Ephemeral['resolve']
						schema: Prettify<
							MergeSchema<
								UnwrapRoute<LocalSchema, Definitions['type']>,
								Metadata['schema'] & Ephemeral['schema']
							>
						>
					}
				}
			: ElysiaCustom & {
					Volatile: {
						derive: Volatile['derive']
						resolve: Volatile['resolve']
						schema: Prettify<
							MergeSchema<
								UnwrapRoute<LocalSchema, Definitions['type']>,
								Metadata['schema'] & Volatile['schema']
							>
						>
					}
				}

	guard(
		hook: LocalHook<
			LocalSchema,
			Schema,
			SingletonBase & SingletonDerRes,
			Definitions['error'],
			Metadata['macro'],
			BasePath
		>
	): ElysiaCustom & {
		Volatile: {
			derive: Volatile['derive']
			resolve: Volatile['resolve']
			schema: Prettify<
				MergeSchema<
					UnwrapRoute<LocalSchema, Definitions['type']>,
					MergeSchema<
						Volatile['schema'],
						MergeSchema<Volatile['schema'], Metadata['schema']>
					>
				>
			>
		}
	}

	guard(
		run: (
			group: ElysiaCustom & {
				Routes: {
					schema: Prettify<Schema>
					macro: Metadata['macro']
					macroFn: Metadata['macroFn']
				}
			}
		) => NewElysia
	): ElysiaCustom & {
		Routes: Prettify<Routes & NewElysia['_routes']>
	}

	guard(
		schema: LocalHook<
			LocalSchema,
			Schema,
			SingletonBase & SingletonDerRes,
			Definitions['error'],
			Metadata['macro']
		>,
		run: (
			group: ElysiaCustom & {
				Metadata : {
					schema: Prettify<Schema>
					macro: Metadata['macro']
					macroFn: Metadata['macroFn']
				},
			Routes : {},
			}
		) => NewElysia
	): ElysiaCustom & {
		Routes: Prettify<Routes & NewElysia['_routes']>
	}

	guard(
		hook:
			| (LocalHook<any, any, any, any, any, any, any> & {
					as: LifeCycleType
			  })
			| ((group: AnyElysia) => AnyElysia),
		run?: (group: AnyElysia) => AnyElysia
	): AnyElysia {
		if (!run) {
			if (typeof hook === 'object') {
				this.applyMacro(hook)
				// this.event = mergeLifeCycle(this.event, hook)

				const type: LifeCycleType = hook.as ?? 'local'

				this.validator[type] = {
					body: hook.body ?? this.validator[type]?.body,
					headers: hook.headers ?? this.validator[type]?.headers,
					params: hook.params ?? this.validator[type]?.params,
					query: hook.query ?? this.validator[type]?.query,
					response: hook.response ?? this.validator[type]?.response,
					cookie: hook.cookie ?? this.validator[type]?.cookie
				}

				if (hook.parse) this.on({ as: type }, 'parse', hook.parse)
				if (hook.transform)
					this.on({ as: type }, 'transform', hook.transform)
				if (hook.beforeHandle)
					this.on({ as: type }, 'beforeHandle', hook.beforeHandle)
				if (hook.afterHandle)
					this.on({ as: type }, 'afterHandle', hook.afterHandle)
				if (hook.mapResponse)
					this.on({ as: type }, 'mapResponse', hook.mapResponse)
				if (hook.afterResponse)
					this.on({ as: type }, 'afterResponse', hook.afterResponse)
				if (hook.error) this.on({ as: type }, 'error', hook.error)

				if (hook.detail) {
					if (this.config.detail)
						this.config.detail = mergeDeep(
							Object.assign({}, this.config.detail),
							hook.detail
						)
					else this.config.detail = hook.detail
				}

				if (hook?.tags) {
					if (!this.config.detail)
						this.config.detail = {
							tags: hook.tags
						}
					else this.config.detail.tags = hook.tags
				}

				return this as any
			}

			return this.guard({}, hook)
		}

		const instance = new Elysia({
			...this.config,
			prefix: ''
		})
		instance.singleton = { ...this.SingletonBase }
		instance.definitions = { ...this.Definitions }
		instance.inference = cloneInference(this.inference)
		instance.extender = { ...this.extender }

		const sandbox = run(instance)
		this.SingletonBase = mergeDeep(
			this.SingletonBase,
			instance.singleton
		) as any
		this.Definitions = mergeDeep(this.Definitions, instance.definitions)

		// ? Inject getServer for websocket and trace (important, do not remove)
		sandbox.getServer = () => this.server

		if (sandbox.event.request.length)
			this.event.request = [
				...(this.event.request || []),
				...(sandbox.event.request || [])
			]

		if (sandbox.event.mapResponse.length)
			this.event.mapResponse = [
				...(this.event.mapResponse || []),
				...(sandbox.event.mapResponse || [])
			]

		this.model(sandbox.definitions.type)

		Object.values(instance.router.history).forEach(
			({ method, path, handler, hooks: localHook }) => {
				this.add(
					method,
					path,
					handler,
					mergeHook(hook as LocalHook<any, any, any, any, any>, {
						...((localHook || {}) as LocalHook<
							any,
							any,
							any,
							any,
							any
						>),
						error: !localHook.error
							? sandbox.event.error
							: Array.isArray(localHook.error)
								? [
										...(localHook.error || {}),
										...(sandbox.event.error || [])
									]
								: [
										localHook.error,
										...(sandbox.event.error || [])
									]
					})
				)
			}
		)

		return this as any
	}
}
