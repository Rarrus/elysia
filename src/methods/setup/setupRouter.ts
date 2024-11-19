import { Memoirist } from 'memoirist'
import type { ComposedHandler, InternalRoute } from '../../types'
import type { DynamicHandler } from '../../dynamic-handle'

export default function setupRouter() {
	const memoiristSetup = new Memoirist<{
		compile: Function
		handler?: ComposedHandler
	}>()
	return {
		http: memoiristSetup,
		ws: memoiristSetup,
		// Use in non-AOT mode
		dynamic: new Memoirist<DynamicHandler>(),
		static: {
			http: {
				static: {} as Record<string, Response>,
				handlers: [] as ComposedHandler[],
				map: {} as Record<
					string,
					{
						code: string
						all?: string
						static?: Function
					}
				>,
				all: ''
			},
			// Static WS Router is consists of pathname and websocket handler index to compose
			ws: {} as Record<string, number>
		},
		history: [] as InternalRoute[]
	}
}