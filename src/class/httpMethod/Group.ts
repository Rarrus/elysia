import {
	InputSchema,
	LocalHook,
	MergeSchema,
	Prettify,
	UnwrapRoute
} from '../../../types'
import Elysia, { AnyElysia } from '../../Elysia'
import { cloneInference, mergeDeep, mergeHook } from '../../../utils'
import { SingletonDerRes } from '../../../types/syngletonType'
import { GInterface } from '../../../interface/GInterface'

export default class Group<GType extends GInterface> {
	[x: string]: any

	group(
		prefix: Prefix,
		run: (
			group: ElysiaCustom & {
				BasePath: `${BasePath}${Prefix}`
				Routes: {}
			}
		) => NewElysia
	): ElysiaCustom & {
		Routes: Prettify<Routes & NewElysia['_routes']>
	}

	group<
		const Input extends InputSchema<
			Extract<keyof Definitions['type'], string>
		>,
		const Schema extends MergeSchema<
			UnwrapRoute<Input, Definitions['type']>,
			Metadata['schema']
		>
	>(
		prefix: Prefix,
		schema: LocalHook<
			Input,
			Schema,
			Singleton & SingletonDerRes<>,
			Definitions['error'],
			Metadata['macro'],
			`${BasePath}${Prefix}`
		>,
		run: (
			group: ElysiaCustom & {
				BasePath: `${BasePath}${Prefix}`
				Scoped: false
				Routes: {}
				Metadata: {
					schema: Schema
					macro: Metadata['macro']
					macroFn: Metadata['macroFn']
				}
			}
		) => NewElysia
	): ElysiaCustom & {
		Routes: Routes & NewElysia['_routes']
	}

	/**
	 * ### group
	 * Encapsulate and group path with prefix
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .group('/v1', app => app
	 *         .get('/', () => 'Hi')
	 *         .get('/name', () => 'Elysia')
	 *     })
	 * ```
	 */
	group(
		prefix: string,
		schemaOrRun:
			| LocalHook<any, any, any, any, any, any>
			| ((group: AnyElysia) => AnyElysia),
		run?: (group: AnyElysia) => AnyElysia
	): AnyElysia {
		const instance = new Elysia({
			...this.config,
			prefix: ''
		})

		instance.singleton = { ...this.Singleton }
		instance.definitions = { ...this.Definitions }
		instance.getServer = () => this.getServer()
		instance.inference = cloneInference(this.inference)
		instance.extender = { ...this.extender }

		const isSchema = typeof schemaOrRun === 'object'
		const sandbox = (isSchema ? run! : schemaOrRun)(instance)
		this.Singleton = mergeDeep(this.Singleton, instance.singleton) as any
		this.Definitions = mergeDeep(this.Definitions, instance.definitions)

		if (sandbox.event.request.length)
			this.event.request = [
				...(this.event.request || []),
				...((sandbox.event.request || []) as any)
			]

		if (sandbox.event.mapResponse.length)
			this.event.mapResponse = [
				...(this.event.mapResponse || []),
				...((sandbox.event.mapResponse || []) as any)
			]

		this.model(sandbox.Definitions.type)

		Object.values(instance.router.history).forEach(
			({ method, path, handler, hooks }) => {
				path = (isSchema ? '' : this.config.prefix) + prefix + path

				if (isSchema) {
					const hook = schemaOrRun
					const localHook = hooks as LocalHook<
						any,
						any,
						any,
						any,
						any,
						any,
						any
					>

					this.add(
						method,
						path,
						handler,
						mergeHook(hook, {
							...(localHook || {}),
							error: !localHook.error
								? sandbox.event.error
								: Array.isArray(localHook.error)
									? [
											...(localHook.error || {}),
											...(sandbox.event.error || {})
										]
									: [
											localHook.error,
											...(sandbox.event.error || {})
										]
						})
					)
				} else {
					this.add(
						method,
						path,
						handler,
						mergeHook(
							hooks as LocalHook<any, any, any, any, any, any>,
							{
								error: sandbox.event.error
							}
						),
						{
							skipPrefix: true
						}
					)
				}
			}
		)

		return this as any
	}
}
