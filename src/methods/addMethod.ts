export default  function add(
	method: HTTPMethod,
	path: string,
	handle: Handler<any, any, any> | any,
	localHook?: LocalHook<any, any, any, any, any, any>,
	{ allowMeta = false, skipPrefix = false } = {
		allowMeta: false as boolean | undefined,
		skipPrefix: false as boolean | undefined
	}
) {
	localHook = localHookToLifeCycleStore(localHook)

	if (path !== '' && path.charCodeAt(0) !== 47) path = '/' + path

	if (this.config.prefix && !skipPrefix && !this.config.scoped)
		path = this.config.prefix + path

	if (localHook?.type)
		switch (localHook.type) {
			case 'text':
				localHook.type = 'text/plain'
				break

			case 'json':
				localHook.type = 'application/json'
				break

			case 'formdata':
				localHook.type = 'multipart/form-data'
				break

			case 'urlencoded':
				localHook.type = 'application/x-www-form-urlencoded'
				break

			case 'arrayBuffer':
				localHook.type = 'application/octet-stream'
				break

			default:
				break
		}

	const models = this.definitions.type

	// ? Clone is need because of JIT, so the context doesn't switch between instance
	const dynamic = !this.config.aot

	const instanceValidator = { ...this.validator.getCandidate() }

	const cloned = {
		body: localHook?.body ?? (instanceValidator?.body as any),
		headers: localHook?.headers ?? (instanceValidator?.headers as any),
		params: localHook?.params ?? (instanceValidator?.params as any),
		query: localHook?.query ?? (instanceValidator?.query as any),
		cookie: localHook?.cookie ?? (instanceValidator?.cookie as any),
		response:
			localHook?.response ?? (instanceValidator?.response as any)
	}

	const cookieValidator = () =>
		cloned.cookie
			? getCookieValidator({
				validator: cloned.cookie,
				defaultConfig: this.config.cookie,
				config: cloned.cookie?.config ?? {},
				dynamic,
				models
			})
			: undefined

	const normalize = this.config.normalize

	const loosePath = path.endsWith('/')
		? path.slice(0, path.length - 1)
		: path + '/'

	// ! Init default [] for hooks if undefined
	localHook = mergeHook(localHook, instanceValidator)

	if (localHook.tags) {
		if (!localHook.detail)
			localHook.detail = {
				tags: localHook.tags
			}
		else localHook.detail.tags = localHook.tags
	}

	if (isNotEmpty(this.config.detail))
		localHook.detail = mergeDeep(
			Object.assign({}, this.config.detail!),
			localHook.detail
		)

	this.applyMacro(localHook)

	const hooks = mergeHook(this.event, localHook)

	if (this.config.aot === false) {
		this.router.dynamic.add(method, path, {
			validator: validatorMethod,
			hooks,
			content: localHook?.type as string,
			handle
		})

		if (this.config.strictPath === false) {
			this.router.dynamic.add(method, loosePath, {
				validator: validatorMethod,
				hooks,
				content: localHook?.type as string,
				handle
			})
		}

		this.router.history.push({
			method,
			path,
			composed: null,
			handler: handle,
			hooks: hooks as any
		})

		return
	}

	const shouldPrecompile =
		this.config.precompile === true ||
		(typeof this.config.precompile === 'object' &&
			this.config.precompile.compose === true)

	const inference = cloneInference(this.inference)

	const staticHandler =
		typeof handle !== 'function'
			? createStaticHandler(handle, hooks, this.setHeaders)
			: undefined

	const nativeStaticHandler =
		typeof handle !== 'function'
			? createNativeStaticHandler(handle, hooks, this.setHeaders)
			: undefined

	if (
		this.config.nativeStaticResponse === true &&
		nativeStaticHandler &&
		(method === 'GET' || method === 'ALL')
	)
		this.router.static.http.static[path] = nativeStaticHandler()

	const compile = () =>
		composeHandler({
			app: this,
			path,
			method,
			localHook: mergeHook(localHook),
			hooks,
			validator: validatorMethod,
			handler: handle,
			allowMeta,
			inference
		})

	const mainHandler = shouldPrecompile
		? compile()
		: (((context: Context) => {
			return compile()(context)
		}) as ComposedHandler)

	const routeIndex = this.router.history.length

	if (this.routeTree.has(method + path))
		for (let i = 0; i < this.router.history.length; i++) {
			const route = this.router.history[i]
			if (route.path === path && route.method === method) {
				const removed = this.router.history.splice(i, 1)[0]

				if (
					removed &&
					this.routeTree.has(removed?.method + removed?.path)
				)
					this.routeTree.delete(removed.method + removed.path)
			}
		}
	else this.routeTree.set(method + path, routeIndex)

	this.router.history.push({
		method,
		path,
		composed: mainHandler,
		handler: handle,
		hooks: hooks as any
	})

	const staticRouter = this.router.static.http

	const handler = {
		handler: shouldPrecompile ? mainHandler : undefined,
		compile
	}

	if (method === '$INTERNALWS') {
		const loose = this.config.strictPath
			? undefined
			: path.endsWith('/')
				? path.slice(0, path.length - 1)
				: path + '/'

		if (path.indexOf(':') === -1 && path.indexOf('*') === -1) {
			const index = staticRouter.handlers.length
			staticRouter.handlers.push((ctx) =>
				(
					(staticRouter.handlers[index] =
						compile()) as ComposedHandler
				)(ctx)
			)

			this.router.static.ws[path] = index
			if (loose) this.router.static.ws[loose] = index
		} else {
			this.router.ws.add('ws', path, handler)
			if (loose) this.router.ws.add('ws', loose, handler)
		}

		return
	}

	if (path.indexOf(':') === -1 && path.indexOf('*') === -1) {
		const index = staticRouter.handlers.length
		staticRouter.handlers.push(
			(staticHandler as any) ??
			((ctx) =>
				(
					(staticRouter.handlers[index] =
						compile()) as ComposedHandler
				)(ctx))
		)

		if (!staticRouter.map[path])
			staticRouter.map[path] = {
				code: ''
			}

		const ctx = staticHandler ? '' : 'ctx'

		if (method === 'ALL')
			staticRouter.map[path].all =
				`default: return st[${index}](${ctx})\n`
		else
			staticRouter.map[path].code =
				`case '${method}': return st[${index}](${ctx})\n${staticRouter.map[path].code}`

		if (!this.config.strictPath) {
			if (!staticRouter.map[loosePath])
				staticRouter.map[loosePath] = {
					code: ''
				}

			if (
				this.config.nativeStaticResponse === true &&
				nativeStaticHandler &&
				(method === 'GET' || method === 'ALL')
			)
				this.router.static.http.static[loosePath] =
					nativeStaticHandler()

			if (method === 'ALL')
				staticRouter.map[loosePath].all =
					`default: return st[${index}](${ctx})\n`
			else
				staticRouter.map[loosePath].code =
					`case '${method}': return st[${index}](${ctx})\n${staticRouter.map[loosePath].code}`
		}
	} else {
		this.router.http.add(method, path, handler)

		if (!this.config.strictPath) {
			const loosePath = path.endsWith('/')
				? path.slice(0, path.length - 1)
				: path + '/'

			if (
				this.config.nativeStaticResponse === true &&
				staticHandler &&
				(method === 'GET' || method === 'ALL')
			)
				this.router.static.http.static[loosePath] = staticHandler()

			this.router.http.add(method, loosePath, handler)
		}
	}
}