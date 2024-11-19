
export default  function plingScoped(){


const isScoped = plugin.config.scoped as boolean
if (isScoped) {
	if (name) {
		if (!(name in this.dependencies)) this.dependencies[name] = []

		const current =
			seed !== undefined ? checksum(name + JSON.stringify(seed)) : 0

		if (
			this.dependencies[name].some(({ checksum }) => current === checksum)
		)
			return this

		this.dependencies[name].push(
			!this.config?.analytic
				? {
						name: plugin.config.name,
						seed: plugin.config.seed,
						checksum: current,
						dependencies: plugin.dependencies
					}
				: {
						name: plugin.config.name,
						seed: plugin.config.seed,
						checksum: current,
						dependencies: plugin.dependencies,
						stack: plugin.telemetry.stack,
						routes: plugin.router.history,
						decorators: plugin.SingletonBase.decorator,
						store: plugin.SingletonBase.store,
						type: plugin.DefinitionBase.type,
						error: plugin.DefinitionBase.error,
						derive: plugin.event.transform
							.filter((x) => x.subType === 'derive')
							.map((x) => ({
								fn: x.fn.toString(),
								stack: new Error().stack ?? ''
							})),
						resolve: plugin.event.transform
							.filter((x) => x.subType === 'derive')
							.map((x) => ({
								fn: x.fn.toString(),
								stack: new Error().stack ?? ''
							}))
					}
		)
	}

	plugin.extender.macros = this.extender.macros.concat(plugin.extender.macros)

	const macroHashes = <(number | undefined)[]>[]
	for (let i = 0; i < plugin.extender.macros.length; i++) {
		const macro = this.extender.macros[i]

		if (macroHashes.includes(macro.checksum)) {
			plugin.extender.macros.splice(i, 1)
			i--
		}

		macroHashes.push(macro.checksum)
	}

	plugin.onRequest((context) => {
		Object.assign(context, this.SingletonBase.decorator)
		Object.assign(context.store, this.SingletonBase.store)
	})

	if (plugin.event.trace.length)
		plugin.event.trace.push(...plugin.event.trace)

	if (!plugin.config.prefix)
		console.warn(
			"It's recommended to use scoped instance with a prefix to prevent collision routing with other instance."
		)

	if (plugin.event.error.length) plugin.event.error.push(...this.event.error)

	if (plugin.config.aot) plugin.compile()

	if (isScoped === true && plugin.config.prefix) {
		this.mount(plugin.config.prefix + '/', plugin.fetch)

		// Ensure that when using plugins routes are correctly showing up in the .routes property. Else plugins e.g. swagger will not correctly work.
		// This also avoids adding routes multiple times.
		for (const route of plugin.router.history) {
			this.routeTree.set(
				route.method + `${plugin.config.prefix}${route.path}`,
				this.router.history.length
			)

			this.router.history.push({
				...route,
				path: `${plugin.config.prefix}${route.path}`,
				hooks: mergeHook(route.hooks, {
					error: this.event.error
				})
			})
		}
	} else {
		this.mount(plugin.fetch)

		for (const route of plugin.router.history) {
			this.routeTree.set(
				route.method + `${plugin.config.prefix}${route.path}`,
				this.router.history.length
			)

			this.router.history.push({
				...route,
				path: `${plugin.config.prefix}${route.path}`,
				hooks: mergeHook(route.hooks, {
					error: this.event.error
				})
			})
		}
	}

	return this
} else {
	this.headers(plugin.setHeaders)

	if (name) {
		if (!(name in this.dependencies)) this.dependencies[name] = []

		const current =
			seed !== undefined ? checksum(name + JSON.stringify(seed)) : 0

		if (
			!this.dependencies[name].some(
				({ checksum }) => current === checksum
			)
		) {
			this.extender.macros = this.extender.macros.concat(
				plugin.extender.macros
			)

			this.extender.higherOrderFunctions =
				this.extender.higherOrderFunctions.concat(
					plugin.extender.higherOrderFunctions
				)
		}
	} else {
		this.extender.macros = this.extender.macros.concat(
			plugin.extender.macros
		)
		this.extender.higherOrderFunctions =
			this.extender.higherOrderFunctions.concat(
				plugin.extender.higherOrderFunctions
			)
	}

	// ! Deduplicate current instance
	deduplicateChecksum(this.extender.macros)
	deduplicateChecksum(this.extender.higherOrderFunctions)

	// ! Deduplicate current instance
	const hofHashes: number[] = []
	for (let i = 0; i < this.extender.higherOrderFunctions.length; i++) {
		const hof = this.extender.higherOrderFunctions[i]

		if (hof.checksum) {
			if (hofHashes.includes(hof.checksum)) {
				this.extender.higherOrderFunctions.splice(i, 1)
				i--
			}

			hofHashes.push(hof.checksum)
		}
	}

	this.inference = {
		body: this.inference.body || plugin.inference.body,
		cookie: this.inference.cookie || plugin.inference.cookie,
		headers: this.inference.headers || plugin.inference.headers,
		query: this.inference.query || plugin.inference.query,
		set: this.inference.set || plugin.inference.set,
		server: this.inference.server || plugin.inference.server
	}
}
}