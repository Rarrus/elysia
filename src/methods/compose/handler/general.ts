export const composeGeneralHandler = (
	app: Elysia<any, any, any, any, any, any, any, any>,
) => {
	const standardHostname = app.config.handler?.standardHostname ?? true;

	let decoratorsLiteral = "";
	let fnLiteral = "";

	// @ts-expect-error private
	const defaultHeaders = app.setHeaders;

	// @ts-ignore
	for (const key of Object.keys(app.singleton.decorator))
		decoratorsLiteral += `,${key}: app.singleton.decorator.${key}`;

	const router = app.router;
	const hasTrace = app.event.trace.length > 0;

	let findDynamicRoute = `
	const route = router.find(request.method, path) ${
		router.http.root.ALL ? '?? router.find("ALL", path)' : ""
	}

	if (route === null)
		return ${
			app.event.error.length
				? `app.handleError(ctx, notFound)`
				: app.event.request.length
					? `new Response(error404Message, {
					status: ctx.set.status === 200 ? 404 : ctx.set.status,
					headers: ctx.set.headers
				})`
					: `error404.clone()`
		}

	ctx.params = route.params\n`;

	findDynamicRoute += `if(route.store.handler) return route.store.handler(ctx)
	return (route.store.handler = route.store.compile())(ctx)\n`;

	let switchMap = ``;
	for (const [path, { code, all, static: staticFn }] of Object.entries(
		router.static.http.map,
	)) {
		if (staticFn)
			switchMap += `case '${path}':\nswitch(request.method) {\n${code}\n${
				all ?? `default: break map`
			}}\n\n`;

		switchMap += `case '${path}':\nswitch(request.method) {\n${code}\n${
			all ?? `default: break map`
		}}\n\n`;
	}

	const maybeAsync = app.event.request.some(isAsync);

	fnLiteral += `const {
		app,
		mapEarlyResponse,
		NotFoundError,
		randomId,
		handleError,
		error,
		redirect,
		ELYSIA_TRACE,
		ELYSIA_REQUEST_ID,
		getServer
	} = data

	const store = app.singleton.store
	const staticRouter = app.router.static.http
	const st = staticRouter.handlers
	const wsRouter = app.router.ws
	const router = app.router.http
	const trace = app.event.trace.map(x => typeof x === 'function' ? x : x.fn)

	const notFound = new NotFoundError()
	const hoc = app.extender.higherOrderFunctions.map(x => x.fn)

	${
		app.event.request.length
			? `const onRequest = app.event.request.map(x => x.fn)`
			: ""
	}
	${
		app.event.error.length
			? ""
			: `\nconst error404Message = notFound.message.toString()
	const error404 = new Response(error404Message, { status: 404 });\n`
	}

	${
		app.event.trace.length
			? `const ${app.event.trace
					.map((_, i) => `tr${i} = app.event.trace[${i}].fn`)
					.join(",")}`
			: ""
	}

	${maybeAsync ? "async" : ""} function map(request) {\n`;

	if (app.event.request.length) fnLiteral += `let re`;

	fnLiteral += `\nconst url = request.url
		const s = url.indexOf('/', ${standardHostname ? 11 : 7})
		const qi = url.indexOf('?', s + 1)
		let path
		if(qi === -1)
			path = url.substring(s)
		else
			path = url.substring(s, qi)\n`;

	fnLiteral += `${hasTrace ? "const id = randomId()" : ""}
		const ctx = {
			request,
			store,
			qi,
			path,
			url,
			redirect,
			set: {
				headers: ${
					Object.keys(defaultHeaders ?? {}).length
						? "Object.assign({}, app.setHeaders)"
						: "{}"
				},
				status: 200
			},
			error
			${
				// @ts-expect-error private property
				app.inference.server
					? `, get server() {
							return getServer()
						}`
					: ""
			}
			${hasTrace ? ",[ELYSIA_REQUEST_ID]: id" : ""}
			${decoratorsLiteral}
		}\n`;

	if (app.event.trace.length)
		fnLiteral += `\nctx[ELYSIA_TRACE] = [${app.event.trace
			.map((_, i) => `tr${i}(ctx)`)
			.join(",")}]\n`;

	const report = createReport({
		context: "ctx",
		trace: app.event.trace,
		addFn(word) {
			fnLiteral += word;
		},
	});

	const reporter = report("request", {
		attribute: "ctx",
		total: app.event.request.length,
	});

	if (app.event.request.length) {
		fnLiteral += `\n try {\n`;

		for (let i = 0; i < app.event.request.length; i++) {
			const hook = app.event.request[i];
			const withReturn = hasReturn(hook);
			const maybeAsync = isAsync(hook);

			const endUnit = reporter.resolveChild(app.event.request[i].fn.name);

			if (withReturn) {
				fnLiteral += `re = mapEarlyResponse(
					${maybeAsync ? "await" : ""} onRequest[${i}](ctx),
					ctx.set,
					request
				)\n`;

				endUnit("re");
				fnLiteral += `if(re !== undefined) return re\n`;
			} else {
				fnLiteral += `${maybeAsync ? "await" : ""} onRequest[${i}](ctx)\n`;
				endUnit();
			}
		}

		fnLiteral += `} catch (error) {
			return app.handleError(ctx, error)
		}`;
	}

	reporter.resolve();

	const wsPaths = app.router.static.ws;
	const wsRouter = app.router.ws;

	if (Object.keys(wsPaths).length || wsRouter.history.length) {
		fnLiteral += `
			if(request.method === 'GET') {
				switch(path) {`;

		for (const [path, index] of Object.entries(wsPaths)) {
			fnLiteral += `
					case '${path}':
						if(request.headers.get('upgrade') === 'websocket')
							return st[${index}](ctx)

						break`;
		}

		fnLiteral += `
				default:
					if(request.headers.get('upgrade') === 'websocket') {
						const route = wsRouter.find('ws', path)

						if(route) {
							ctx.params = route.params

							if(route.store.handler)
							    return route.store.handler(ctx)

							return (route.store.handler = route.store.compile())(ctx)
						}
					}

					break
			}
		}\n`;
	}

	fnLiteral += `
		map: switch(path) {
			${switchMap}

			default:
				break
		}

		${findDynamicRoute}
	}\n`;

	// @ts-expect-error private property
	if (app.extender.higherOrderFunctions.length) {
		let handler = "map";
		// @ts-expect-error private property
		for (let i = 0; i < app.extender.higherOrderFunctions.length; i++)
			handler = `hoc[${i}](${handler}, request)`;

		fnLiteral += `return function hocMap(request) { return ${handler}(request) }`;
	} else fnLiteral += `return map`;

	// console.log(fnLiteral)

	const handleError = composeErrorHandler(app) as any;

	// @ts-expect-error
	app.handleError = handleError;

	return Function(
		"data",
		fnLiteral,
	)({
		app,
		mapEarlyResponse,
		NotFoundError,
		randomId,
		handleError,
		error,
		redirect,
		ELYSIA_TRACE,
		ELYSIA_REQUEST_ID,
		// @ts-expect-error private property
		getServer: () => app.getServer(),
	});
};
