import type  {
	ComposeElysiaResponse,
	CreateEden,
	HTTPMethod,
	JoinPath,
	ResolvePath
} from '../types'
import type  { handleInterface, Schema } from './handleType'
import type  { GInterface } from '../interface/GInterface'
import type Elysia from '../class/Elysia'

type HTTPMehodMinimal =
	| 'delete'
	| 'create'
	| 'put'
	| 'get'
	| 'head'
	| 'options'
	| 'patch'
	| 'post'
	| string
	| HTTPMethod
// TODO replace string
export type customHTTPMethod<
	httpType extends HTTPMehodMinimal,
	GType extends Pick<GInterface, 'BasePath' | 'Path' | 'Routes'>,
	Handle extends handleInterface<{
		BasePath: GType['BasePath']
		Path: GType['Path']
	}>
> = Omit<Elysia, "Routes"> & {
	Routes: {
		RouteBase: GType['Routes'] &
			CreateEden<
				JoinPath<GType['BasePath'], GType['Path']>,
				{
					[k in httpType]: {
						body: Schema['body']
						params: undefined extends Schema['params']
							? ResolvePath<GType['Path']>
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
	}
}
