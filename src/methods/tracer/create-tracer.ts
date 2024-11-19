export const ELYSIA_TRACE = Symbol("ElysiaTrace");

export const createTracer = (traceListener: TraceHandler) => {
	return (context: Context) => {
		const [onRequest, resolveRequest] = createProcess();
		const [onParse, resolveParse] = createProcess();
		const [onTransform, resolveTransform] = createProcess();
		const [onBeforeHandle, resolveBeforeHandle] = createProcess();
		const [onHandle, resolveHandle] = createProcess();
		const [onAfterHandle, resolveAfterHandle] = createProcess();
		const [onError, resolveError] = createProcess();
		const [onMapResponse, resolveMapResponse] = createProcess();
		const [onAfterResponse, resolveAfterResponse] = createProcess();

		traceListener({
			// @ts-ignore
			id: context[ELYSIA_REQUEST_ID],
			context,
			set: context.set,
			// @ts-ignore
			onRequest,
			// @ts-ignore
			onParse,
			// @ts-ignore
			onTransform,
			// @ts-ignore
			onBeforeHandle,
			// @ts-ignore
			onHandle,
			// @ts-ignore
			onAfterHandle,
			// @ts-ignore
			onMapResponse,
			// @ts-ignore
			onAfterResponse,
			// @ts-ignore
			onError,
		});

		// ? This is pass to compiler
		return {
			request: resolveRequest,
			parse: resolveParse,
			transform: resolveTransform,
			beforeHandle: resolveBeforeHandle,
			handle: resolveHandle,
			afterHandle: resolveAfterHandle,
			error: resolveError,
			mapResponse: resolveMapResponse,
			afterResponse: resolveAfterResponse,
		};
	};
};
