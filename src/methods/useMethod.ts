  export default function  _use(
		plugin: AnyElysia | ((app: AnyElysia) => MaybePromise<AnyElysia>)
	) {
		if (typeof plugin === 'function') {
			const instance = plugin(this as unknown as any) as unknown as any
			if (instance instanceof Promise) {
				this.promisedModules.add(
					instance
						.then((plugin) => {
							if (plugin instanceof Elysia) {
								plugin.getServer = () => this.getServer()
								plugin.getGlobalRoutes = () =>
									this.getGlobalRoutes()

								/**
								 * Model and error is required for Swagger generation
								 */
								plugin.model(this.definitions.type as any)
								plugin.error(this.definitions.error as any)

								// Recompile async plugin routes
								for (const {
									method,
									path,
									handler,
									hooks
								} of Object.values(plugin.router.history)) {
									this.add(
										method,
										path,
										handler,
										mergeHook(
											hooks as LocalHook<
												any,
												any,
												any,
												any,
												any,
												any
											>,
											{
												error: plugin.event.error
											}
										)
									)
								}

								plugin.compile()

								return plugin
							}

							if (typeof plugin === 'function')
								return plugin(
									this as unknown as any
								) as unknown as Elysia

							if (typeof plugin.default === 'function')
								return plugin.default(
									this as unknown as any
								) as unknown as Elysia

							// @ts-ignore
							return this._use(plugin)
						})
						.then((x) => x.compile())
				)
				return this as unknown as any
			}

			return instance
		}

		const { name, seed } = plugin.config

		plugin.getServer = () => this.getServer()
		plugin.getGlobalRoutes = () => this.getGlobalRoutes()

		/**
		 * Model and error is required for Swagger generation
		 */
		plugin.model(this.definitions.type as any)
		plugin.error(this.definitions.error as any)

		const isScoped = plugin.config.scoped as boolean
		if (isScoped) {
			if (name) {
				if (!(name in this.dependencies)) this.dependencies[name] = []

				const current =
					seed !== undefined
						? checksum(name + JSON.stringify(seed))
						: 0

				if (
					this.dependencies[name].some(
						({ checksum }) => current === checksum
					)
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
								decorators: plugin.singleton.decorator,
								store: plugin.singleton.store,
								type: plugin.definitions.type,
								error: plugin.definitions.error,
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

			plugin.extender.macros = this.extender.macros.concat(
				plugin.extender.macros
			)

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
				Object.assign(context, this.singleton.decorator)
				Object.assign(context.store, this.singleton.store)
			})

			if (plugin.event.trace.length)
				plugin.event.trace.push(...plugin.event.trace)

			if (!plugin.config.prefix)
				console.warn(
					"It's recommended to use scoped instance with a prefix to prevent collision routing with other instance."
				)

			if (plugin.event.error.length)
				plugin.event.error.push(...this.event.error)

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
					seed !== undefined
						? checksum(name + JSON.stringify(seed))
						: 0

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
			for (
				let i = 0;
				i < this.extender.higherOrderFunctions.length;
				i++
			) {
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

		this.decorate(plugin.singleton.decorator)
		this.state(plugin.singleton.store)
		this.model(plugin.definitions.type)
		this.error(plugin.definitions.error as any)
		plugin.extender.macros = this.extender.macros.concat(
			plugin.extender.macros
		)

		for (const { method, path, handler, hooks } of Object.values(
			plugin.router.history
		)) {
			this.add(
				method,
				path,
				handler,
				mergeHook(
					hooks as LocalHook<any, any, any, any, any, any, any>,
					{
						error: plugin.event.error
					}
				)
			)
		}

		if (!isScoped)
			if (name) {
				if (!(name in this.dependencies)) this.dependencies[name] = []

				const current =
					seed !== undefined
						? checksum(name + JSON.stringify(seed))
						: 0

				if (
					this.dependencies[name].some(
						({ checksum }) => current === checksum
					)
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
								decorators: plugin.singleton,
								store: plugin.singleton.store,
								type: plugin.definitions.type,
								error: plugin.definitions.error,
								derive: plugin.event.transform
									.filter((x) => x?.subType === 'derive')
									.map((x) => ({
										fn: x.toString(),
										stack: new Error().stack ?? ''
									})),
								resolve: plugin.event.transform
									.filter((x) => x?.subType === 'resolve')
									.map((x) => ({
										fn: x.toString(),
										stack: new Error().stack ?? ''
									}))
							}
				)

				this.event = mergeLifeCycle(
					this.event,
					filterGlobalHook(plugin.event),
					current
				)
			} else {
				this.event = mergeLifeCycle(
					this.event,
					filterGlobalHook(plugin.event)
				)
			}

		// @ts-ignore
		this.validator.global = mergeHook(this.validator.global, {
			...plugin.validator.global
		})
		// @ts-ignore
		this.validator.local = mergeHook(this.validator.local, {
			...plugin.validator.scoped
		})

		return this
	}
