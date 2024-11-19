export const composeErrorHandler = (
	app: Elysia<any, any, any, any, any, any, any, any>,
) => {
	const hooks = app.event;
	let fnLiteral = "";

	fnLiteral += `const {
		app: { event: { error: onErrorContainer, afterResponse: resContainer, mapResponse: _onMapResponse, trace: _trace } },
		mapResponse,
		ERROR_CODE,
		ElysiaCustomStatusResponse,
		ELYSIA_TRACE,
		ELYSIA_REQUEST_ID
	} = inject

	const trace = _trace.map(x => typeof x === 'function' ? x : x.fn)
	const onMapResponse = []

	for(let i = 0; i < _onMapResponse.length; i++)
		onMapResponse.push(_onMapResponse[i].fn ?? _onMapResponse[i])

	delete _onMapResponse

	const onError = onErrorContainer.map(x => x.fn)
	const res = resContainer.map(x => x.fn)

	return ${
		app.event.error.find(isAsync) || app.event.mapResponse.find(isAsync)
			? "async"
			: ""
	} function(context, error, skipGlobal) {`;

	const hasTrace = app.event.trace.length > 0;

	if (hasTrace) fnLiteral += "\nconst id = context[ELYSIA_REQUEST_ID]\n";

	const report = createReport({
		context: "context",
		trace: hooks.trace,
		addFn: (word) => {
			fnLiteral += word;
		},
	});

	fnLiteral += `
		const set = context.set
		let r

		if(!context.code)
			context.code = error.code ?? error[ERROR_CODE]

		if(!(context.error instanceof Error))
			context.error = error

		if(error instanceof ElysiaCustomStatusResponse) {
			error.status = error.code
			error.message = error.response
		}\n`;

	const saveResponse =
		hasTrace || hooks.afterResponse.length > 0 || hooks.afterResponse.length > 0
			? "context.response = "
			: "";

	for (let i = 0; i < app.event.error.length; i++) {
		const handler = app.event.error[i];

		const response = `${
			isAsync(handler) ? "await " : ""
		}onError[${i}](context)`;

		fnLiteral += "\nif(skipGlobal !== true) {\n";

		if (hasReturn(handler)) {
			fnLiteral += `r = ${response}; if(r !== undefined) {
				if(r instanceof Response) return r

				if(r instanceof ElysiaCustomStatusResponse) {
					error.status = error.code
					error.message = error.response
				}

				if(set.status === 200) set.status = error.status\n`;

			const mapResponseReporter = report("mapResponse", {
				total: hooks.mapResponse.length,
				name: "context",
			});

			if (hooks.mapResponse.length) {
				for (let i = 0; i < hooks.mapResponse.length; i++) {
					const mapResponse = hooks.mapResponse[i];

					const endUnit = mapResponseReporter.resolveChild(mapResponse.fn.name);

					fnLiteral += `\ncontext.response = r
						r = ${isAsyncName(mapResponse) ? "await" : ""} onMapResponse[${i}](context)\n`;

					endUnit();
				}
			}

			mapResponseReporter.resolve();

			fnLiteral += `return mapResponse(${saveResponse} r, set, context.request)}\n`;
		} else fnLiteral += response + "\n";

		fnLiteral += "\n}\n";
	}

	fnLiteral += `if(error.constructor.name === "ValidationError" || error.constructor.name === "TransformDecodeError") {
	    const reportedError = error.error ?? error
		set.status = reportedError.status ?? 422
		return new Response(
			reportedError.message,
			{
				headers: Object.assign(
					{ 'content-type': 'application/json'},
					set.headers
				),
				status: set.status
			}
		)
	} else {
		if(error.code && typeof error.status === "number")
			return new Response(
				error.message,
				{ headers: set.headers, status: error.status }
			)\n`;

	const mapResponseReporter = report("mapResponse", {
		total: hooks.mapResponse.length,
		name: "context",
	});

	if (hooks.mapResponse.length) {
		for (let i = 0; i < hooks.mapResponse.length; i++) {
			const mapResponse = hooks.mapResponse[i];

			const endUnit = mapResponseReporter.resolveChild(mapResponse.fn.name);

			fnLiteral += `\ncontext.response = error
			error = ${
				isAsyncName(mapResponse) ? "await" : ""
			} onMapResponse[${i}](context)\n`;

			endUnit();
		}
	}

	mapResponseReporter.resolve();

	fnLiteral += `\nreturn mapResponse(${saveResponse} error, set, context.request)\n}\n}`;

	return Function(
		"inject",
		fnLiteral,
	)({
		app,
		mapResponse,
		ERROR_CODE,
		ElysiaCustomStatusResponse,
		ELYSIA_TRACE,
		ELYSIA_REQUEST_ID,
	});
};
