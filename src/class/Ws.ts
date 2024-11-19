import Elysia from '../Elysia'
import {
	CreateEden,
	DefinitionBase,
	EphemeralType,
	InputSchema,
	JoinPath,
	MergeSchema,
	MetadataBase,
	ResolvePath,
	RouteBase,
	SingletonBase,
	UnwrapRoute
} from '../../types'
import { Server, ServerWebSocket } from 'bun'
import { ElysiaWS } from '../../ws'
import { getSchemaValidator, isNumericString } from '../../utils'
import { TSchema } from '@sinclair/typebox'
import { ValidationError } from '../../error'
import { Context } from '../../context'
import { WS } from '../../ws/types'
import { SingletonDerRes } from '../../types/syngletonType'

export default class Ws {
	[x: string]: any

	/**
	 * ### ws
	 * Register handler for path with method [ws]
	 *
	 * ---
	 * @example
	 * ```typescript
	 * import { Elysia, t } from 'elysia'
	 *
	 * new Elysia()
	 *     .ws('/', {
	 *         message(ws, message) {
	 *             ws.send(message)
	 *         }
	 *     })
	 * ```
	 */
	ws<
		const BasePath extends string,
		const Scoped extends boolean,
		const Path extends string,
		const LocalSchema extends InputSchema<
			keyof DefinitionBase['type'] & string
		>,
		const Schema extends MergeSchema<
			UnwrapRoute<LocalSchema, DefinitionBase['type']>,
			MetadataBase['schema']
		>
	>(
		path: Path,
		options: WS.LocalHook<
			LocalSchema,
			Schema,
			SingletonBase & SingletonDerRes,
			DefinitionBase['error'],
			MetadataBase['macro'],
			JoinPath<BasePath, Path>
		>
	): Elysia<
		BasePath,
		Scoped,
		SingletonBase,
		DefinitionBase,
		MetadataBase,
		RouteBase &
			CreateEden<
				JoinPath<BasePath, Path>,
				{
					subscribe: {
						body: Schema['body']
						params: undefined extends Schema['params']
							? ResolvePath<Path>
							: Schema['params']
						query: Schema['query']
						headers: Schema['headers']
						response: {} extends Schema['response']
							? unknown
							: Schema['response'] extends Record<200, unknown>
								? Schema['response'][200]
								: unknown
					}
				}
			>,
		EphemeralType,
		EphemeralType
	> {
		const transform = options.transformMessage
			? Array.isArray(options.transformMessage)
				? options.transformMessage
				: [options.transformMessage]
			: undefined

		let server: Server | null = null

		const validateMessage = getSchemaValidator(options?.body, {
			models: this.DefinitionBase.type as Record<string, TSchema>,
			normalize: this.config.normalize
		})

		const validateResponse = getSchemaValidator(options?.response as any, {
			models: this.DefinitionBase.type as Record<string, TSchema>,
			normalize: this.config.normalize
		})

		const parseMessage = (message: any) => {
			if (typeof message === 'string') {
				const start = message?.charCodeAt(0)

				if (start === 47 || start === 123)
					try {
						message = JSON.parse(message)
					} catch {
						// Not empty
					}
				else if (isNumericString(message)) message = +message
			}

			if (transform?.length)
				for (let i = 0; i < transform.length; i++) {
					const temp = transform[i](message)

					if (temp !== undefined) message = temp
				}

			return message
		}

		this.route(
			'$INTERNALWS',
			path as any,
			// @ts-expect-error
			(context) => {
				// ! Enable static code analysis just in case resolveUnknownFunction doesn't work, do not remove
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { set, path, qi, headers, query, params } = context

				if (server === null) server = this.getServer()

				if (
					server?.upgrade<any>(context.request, {
						headers: (typeof options.upgrade === 'function'
							? options.upgrade(context as any as Context)
							: options.upgrade) as Bun.HeadersInit,
						data: {
							validator: validateResponse,
							open(ws: ServerWebSocket<any>) {
								options.open?.(new ElysiaWS(ws, context as any))
							},
							message: (ws: ServerWebSocket<any>, msg: any) => {
								const message = parseMessage(msg)

								if (validateMessage?.Check(message) === false)
									return void ws.send(
										new ValidationError(
											'message',
											validateMessage,
											message
										).message as string
									)

								options.message?.(
									new ElysiaWS(ws, context as any),
									message as any
								)
							},
							drain(ws: ServerWebSocket<any>) {
								options.drain?.(
									new ElysiaWS(ws, context as any)
								)
							},
							close(
								ws: ServerWebSocket<any>,
								code: number,
								reason: string
							) {
								options.close?.(
									new ElysiaWS(ws, context as any),
									code,
									reason
								)
							}
						}
					})
				)
					return

				set.status = 400

				return 'Expected a websocket connection'
			},
			{
				beforeHandle: options.beforeHandle,
				transform: options.transform,
				headers: options.headers,
				params: options.params,
				query: options.query
			} as any
		)

		return this as any
	}
}
