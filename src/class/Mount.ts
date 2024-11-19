import { Handler, MaybePromise } from '../../types'
import type { AnyElysia } from '../Elysia'
import Elysia from '../Elysia'
import { replaceUrlPath } from '../../utils'

export default class Mount {
	[x: string]: any

	mount(
		handle: ((request: Request) => MaybePromise<Response>) | AnyElysia
	): this

	mount(
		path: string,
		handle: ((request: Request) => MaybePromise<Response>) | AnyElysia
	): this

	mount(
		path:
			| string
			| ((request: Request) => MaybePromise<Response>)
			| AnyElysia,
		handle?: ((request: Request) => MaybePromise<Response>) | AnyElysia
	) {
		if (
			path instanceof Elysia ||
			typeof path === 'function' ||
			path.length === 0 ||
			path === '/'
		) {
			const run =
				typeof path === 'function'
					? path
					: path instanceof Elysia
						? path.compile().fetch
						: handle instanceof Elysia
							? handle.compile().fetch
							: handle!

			const handler: Handler<any, any> = async ({ request, path }) => {
				if (
					request.method === 'GET' ||
					request.method === 'HEAD' ||
					!request.headers.get('content-type')
				)
					return run(
						new Request(
							replaceUrlPath(request.url, path || '/'),
							request
						)
					)

				return run(
					new Request(replaceUrlPath(request.url, path || '/'), {
						...request,
						body: await request.arrayBuffer()
					})
				)
			}

			this.all(
				'/*',
				handler as any,
				{
					type: 'none'
				} as any
			)

			return this
		}

		const length = path.length

		if (handle instanceof Elysia) handle = handle.compile().fetch

		const handler: Handler<any, any> = async ({ request, path }) => {
			if (
				request.method === 'GET' ||
				request.method === 'HEAD' ||
				!request.headers.get('content-type')
			)
				return (handle as Function)(
					new Request(
						replaceUrlPath(request.url, path.slice(length) || '/'),
						request
					)
				)

			return (handle as Function)(
				new Request(
					replaceUrlPath(request.url, path.slice(length) || '/'),
					{
						...request,
						body: await request.arrayBuffer()
					}
				)
			)
		}

		this.all(
			path,
			handler as any,
			{
				type: 'none'
			} as any
		)

		this.all(
			path + (path.endsWith('/') ? '*' : '/*'),
			handler as any,
			{
				type: 'none'
			} as any
		)

		return this
	}
}
