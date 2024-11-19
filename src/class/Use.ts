import type { AnyElysia } from '../Elysia'
import Elysia from '../Elysia'
import {
	CreateEden,
	DefinitionBase,
	EphemeralType,
	MaybePromise,
	MetadataBase,
	Prettify2,
	RouteBase,
	SingletonBase
} from '../../types'

export default class Use {
	[x: string]: any

	/**
	 * Inline fn
	 */
	use<
		const BasePath extends string,
		const Scoped extends boolean,
		const NewElysia extends AnyElysia,
		const Param extends AnyElysia = this
	>(
		plugin: MaybePromise<(app: Param) => MaybePromise<NewElysia>>
	): NewElysia['_scoped'] extends false
		? Elysia<
				BasePath,
				Scoped,
				Prettify2<SingletonBase & NewElysia['_types']['singleton']>,
				Prettify2<DefinitionBase & NewElysia['_types']['Definitions']>,
				Prettify2<MetadataBase & NewElysia['_types']['Metadata']>,
				BasePath extends ``
					? RouteBase & NewElysia['_routes']
					: RouteBase & CreateEden<BasePath, NewElysia['_routes']>,
				Prettify2<EphemeralType & NewElysia['_ephemeral']>,
				Prettify2<EphemeralType & NewElysia['_ephemeral']>
			>
		: Elysia<
				BasePath,
				Scoped,
				SingletonBase,
				DefinitionBase,
				MetadataBase,
				BasePath extends ``
					? RouteBase & NewElysia['_routes']
					: RouteBase & CreateEden<BasePath, NewElysia['_routes']>,
				EphemeralType,
				EphemeralType
			>

	/**
	 * Entire Instance
	 **/
	use<
		const BasePath extends string,
		const Scoped extends boolean,
		const NewElysia extends AnyElysia
	>(
		instance: MaybePromise<NewElysia>
	): NewElysia['_scoped'] extends false
		? Elysia<
				BasePath,
				Scoped,
				Prettify2<SingletonBase & NewElysia['_types']['Singleton']>,
				Prettify2<DefinitionBase & NewElysia['_types']['Definitions']>,
				Prettify2<MetadataBase & NewElysia['_types']['Metadata']>,
				BasePath extends ``
					? RouteBase & NewElysia['_routes']
					: RouteBase & CreateEden<BasePath, NewElysia['_routes']>,
				EphemeralType,
				Prettify2<EphemeralType & NewElysia['_ephemeral']>
			>
		: Elysia<
				BasePath,
				Scoped,
				SingletonBase,
				DefinitionBase,
				MetadataBase,
				BasePath extends ``
					? RouteBase & NewElysia['_routes']
					: RouteBase & CreateEden<BasePath, NewElysia['_routes']>,
				EphemeralType,
				EphemeralType
			>

	/**
	 * Import fn
	 */
	use<
		const BasePath extends string,
		const Scoped extends boolean,
		const NewElysia extends AnyElysia
	>(
		plugin: Promise<{
			default: (elysia: AnyElysia) => MaybePromise<NewElysia>
		}>
	): NewElysia['_scoped'] extends false
		? Elysia<
				BasePath,
				Scoped,
				Prettify2<SingletonBase & NewElysia['_types']['Singleton']>,
				Prettify2<DefinitionBase & NewElysia['_types']['Definitions']>,
				Prettify2<MetadataBase & NewElysia['_types']['Metadata']>,
				BasePath extends ``
					? RouteBase & NewElysia['_routes']
					: RouteBase & CreateEden<BasePath, NewElysia['_routes']>,
				Prettify2<EphemeralType & NewElysia['_ephemeral']>,
				Prettify2<EphemeralType & NewElysia['_ephemeral']>
			>
		: Elysia<
				BasePath,
				Scoped,
				SingletonBase,
				DefinitionBase,
				MetadataBase,
				BasePath extends ``
					? RouteBase & NewElysia['_routes']
					: RouteBase & CreateEden<BasePath, NewElysia['_routes']>,
				EphemeralType,
				EphemeralType
			>

	/**
	 * Import entire instance
	 */
	use<
		const BasePath extends string,
		const Scoped extends boolean,
		const LazyLoadElysia extends AnyElysia
	>(
		plugin: Promise<{
			default: LazyLoadElysia
		}>
	): LazyLoadElysia['_scoped'] extends false
		? Elysia<
				BasePath,
				Scoped,
				Prettify2<
					SingletonBase & LazyLoadElysia['_types']['Singleton']
				>,
				Prettify2<
					DefinitionBase & LazyLoadElysia['_types']['Definitions']
				>,
				Prettify2<MetadataBase & LazyLoadElysia['_types']['Metadata']>,
				BasePath extends ``
					? RouteBase & LazyLoadElysia['_routes']
					: RouteBase &
							CreateEden<BasePath, LazyLoadElysia['_routes']>,
				EphemeralType,
				Prettify2<EphemeralType & LazyLoadElysia['_ephemeral']>
			>
		: Elysia<
				BasePath,
				Scoped,
				SingletonBase,
				DefinitionBase,
				MetadataBase,
				BasePath extends ``
					? RouteBase & LazyLoadElysia['_routes']
					: RouteBase &
							CreateEden<BasePath, LazyLoadElysia['_routes']>,
				EphemeralType,
				EphemeralType
			>

	/**
	 * ### use
	 * Merge separate logic of Elysia with current
	 *
	 * ---
	 * @example
	 * ```typescript
	 * const plugin = (app: Elysia) => app
	 *     .get('/plugin', () => 'hi')
	 *
	 * new Elysia()
	 *     .use(plugin)
	 * ```
	 */
	use(
		plugin:
			| MaybePromise<AnyElysia>
			| MaybePromise<
					AnyElysia | ((app: AnyElysia) => MaybePromise<AnyElysia>)
			  >
			| Promise<{
					default:
						| AnyElysia
						| ((app: AnyElysia) => MaybePromise<AnyElysia>)
			  }>,
		options?: { scoped?: boolean }
	): AnyElysia {
		if (options?.scoped)
			return this.guard({}, (app) => app.use(plugin as any))

		if (Array.isArray(plugin)) {
			let current = this

			for (const p of plugin) current = this.use(p) as any

			return current
		}

		if (plugin instanceof Promise) {
			this.promisedModules.add(
				plugin
					.then((plugin) => {
						if (typeof plugin === 'function') return plugin(this)

						if (plugin instanceof Elysia)
							return this._use(plugin).compile()

						if (typeof plugin.default === 'function')
							return plugin.default(this)

						if (plugin.default instanceof Elysia)
							return this._use(plugin.default)

						throw new Error(
							'Invalid plugin type. Expected Elysia instance, function, or module with "default" as Elysia instance or function that returns Elysia instance.'
						)
					})
					.then((x) => x.compile())
			)

			return this
		}

		return this._use(plugin)
	}
}
