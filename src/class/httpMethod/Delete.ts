import {
	ComposeElysiaResponse,
	CreateEden,
	DefinitionBase,
	EphemeralType, InlineHandler,
	InputSchema, JoinPath, LocalHook,
	MergeSchema,
	MetadataBase, ResolvePath, RouteBase,
	SingletonBase,
	UnwrapRoute
} from '../../../types'
import type { Elysia } from '../../Elysia'

export default class Delete {
	[x: string]: any

	/**
	 * ### delete
	 * Register handler for path with method [DELETE]
	 *
	 * ---
	 * @example
	 * ```typescript
	 * import { Elysia, t } from 'elysia'
	 *
	 * new Elysia()
	 *     .delete('/', () => 'hi')
	 *     .delete('/with-hook', () => 'hi', {
	 *         response: t.String()
	 *     })
	 * ```
	 */
	delete<const BasePath extends string,
		const Scoped extends boolean,
		const Path extends string,
				const Handle extends const Handle extends handleInterface<Path, BasePath>terface<Path, BasePath>>

	>(
		path: Path,
		handler: Handle,
		hook?: LocalHook<
			LocalSchema,
			Schema,
			SingletonBase & {
			derive: EphemeralType['derive']
			resolve: EphemeralType['resolve']
		},
			DefinitionBase['error'],
			MetadataBase['macro'],
			JoinPath<BasePath, Path>
		>
	): SetupTypeElysia<
		RouteBase,
		CreateEden<
			JoinPath<BasePath, Path>,
			{
				delete: {
					body: Schema['body']
					params: undefined extends Schema['params']
						? ResolvePath<Path>
						: Schema['params']
					query: Schema['query']
					headers: Schema['headers']
					response: ComposeElysiaResponse<
						Schema['response'],
						Handle
					>
				}
			}
		>
	>
		,
		EphemeralType,
		EphemeralType
	> {
		this.add('DELETE', path, handler as any, hook)

		return this as any
	}
}
