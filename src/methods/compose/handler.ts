const headersHasToJSON = (new Headers() as Headers).toJSON;

const TypeBoxSymbol = {
	optional: Symbol.for("TypeBox.Optional"),
	kind: Symbol.for("TypeBox.Kind"),
} as const;

const composeValidationFactory = ({
	injectResponse = "",
	normalize = false,
	validator,
}: {
	injectResponse?: string;
	normalize?: boolean;
	validator: SchemaValidator;
}) => ({
	composeValidation: (type: string, value = `c.${type}`) =>
		`c.set.status = 422; throw new ValidationError('${type}', validator.${type}, ${value})`,
	composeResponseValidation: (name = "r") => {
		let code = "\n" + injectResponse + "\n";

		code += `if(${name} instanceof ElysiaCustomStatusResponse) {
			c.set.status = ${name}.code
			${name} = ${name}.response
		}

		const isResponse = ${name} instanceof Response\n\n`;

		code += `switch(c.set.status) {\n`;

		for (const [status, value] of Object.entries(
			validator.response as Record<string, TypeCheck<any>>,
		)) {
			code += `\tcase ${status}:
				if (!isResponse) {\n`;

			if (
				normalize &&
				"Clean" in value &&
				!hasAdditionalProperties(value as any)
			)
				code += `${name} = validator.response['${status}'].Clean(${name})\n`;

			code += `if(validator.response['${status}'].Check(${name}) === false) {
					c.set.status = 422

					throw new ValidationError('response', validator.response['${status}'], ${name})
				}

				c.set.status = ${status}
			}

			break\n\n`;
		}

		code += "\n}\n";

		return code;
	},
});

export const composeHandler = ({
	app,
	path,
	method,
	localHook,
	hooks,
	validator,
	handler,
	allowMeta = false,
	inference,
}: {
	app: Elysia<any, any, any, any, any, any, any, any>;
	path: string;
	method: string;
	hooks: LifeCycleStore;
	localHook: LifeCycleStore;
	validator: SchemaValidator;
	handler: unknown | Handler<any, any>;
	allowMeta?: boolean;
	inference: Sucrose.Inference;
}): ComposedHandler => {
	const isHandleFn = typeof handler === "function";

	if (!isHandleFn) {
		handler = mapResponse(handler, {
			// @ts-expect-error private property
			headers: app.setHeaders ?? {},
		});

		if (
			hooks.parse.length === 0 &&
			hooks.transform.length === 0 &&
			hooks.beforeHandle.length === 0 &&
			hooks.afterHandle.length === 0
		)
			return Function("a", `return function () { return a.clone() }`)(handler);
	}

	const handle = isHandleFn ? `handler(c)` : `handler`;
	const hasAfterResponse = hooks.afterResponse.length > 0;

	const hasTrace = hooks.trace.length > 0;
	let fnLiteral = "";

	inference = sucrose(
		Object.assign(localHook, {
			handler: handler as any,
		}),
		inference,
	);

	if (inference.server)
		fnLiteral += `\nObject.defineProperty(c, 'server', {
			get: function() { return getServer() }
		})\n`;

	if (inference.body) fnLiteral += `let isParsing = false\n`;

	validator.createBody?.();
	validator.createQuery?.();
	validator.createHeaders?.();
	validator.createParams?.();
	validator.createCookie?.();
	validator.createResponse?.();

	const hasQuery = inference.query || !!validator.query;

	const hasBody =
		method !== "$INTERNALWS" &&
		method !== "GET" &&
		method !== "HEAD" &&
		(inference.body || !!validator.body || hooks.parse.length);

	// @ts-expect-error private
	const defaultHeaders = app.setHeaders;
	const hasDefaultHeaders =
		defaultHeaders && !!Object.keys(defaultHeaders).length;

	// ? defaultHeaders doesn't imply that user will use headers in handler
	const hasHeaders = inference.headers || validator.headers;
	const hasCookie = inference.cookie || !!validator.cookie;

	const cookieValidator = hasCookie
		? getCookieValidator({
				validator: validator.cookie as any,
				defaultConfig: app.config.cookie,
				dynamic: !!app.config.aot,
				// @ts-expect-error
				config: validator.cookie?.config ?? {},
				// @ts-expect-error
				models: app.definitions.type,
			})
		: undefined;

	// @ts-ignore private property
	const cookieMeta = cookieValidator?.config as {
		secrets?: string | string[];
		sign: string[] | true;
		properties: { [x: string]: Object };
	};

	let encodeCookie = "";

	if (cookieMeta?.sign) {
		if (!cookieMeta.secrets)
			throw new Error(
				`t.Cookie required secret which is not set in (${method}) ${path}.`,
			);

		const secret = !cookieMeta.secrets
			? undefined
			: typeof cookieMeta.secrets === "string"
				? cookieMeta.secrets
				: cookieMeta.secrets[0];

		encodeCookie += `const _setCookie = c.set.cookie
		if(_setCookie) {`;

		if (cookieMeta.sign === true) {
			encodeCookie += `for(const [key, cookie] of Object.entries(_setCookie)) {
				c.set.cookie[key].value = await signCookie(cookie.value, '${secret}')
			}`;
		} else
			for (const name of cookieMeta.sign) {
				encodeCookie += `if(_setCookie['${name}']?.value) { c.set.cookie['${name}'].value = await signCookie(_setCookie['${name}'].value, '${secret}') }\n`;
			}

		encodeCookie += "}\n";
	}

	const normalize = app.config.normalize;

	const { composeValidation, composeResponseValidation } =
		composeValidationFactory({
			normalize,
			validator,
		});

	if (hasHeaders) {
		// This function is Bun specific
		// @ts-ignore
		fnLiteral += headersHasToJSON
			? `c.headers = c.request.headers.toJSON()\n`
			: `c.headers = {}
                for (const [key, value] of c.request.headers.entries())
					c.headers[key] = value
				`;
	}

	if (hasCookie) {
		const get = (name: keyof CookieOptions, defaultValue?: unknown) => {
			// @ts-ignore
			const value = cookieMeta?.[name] ?? defaultValue;
			if (!value)
				return typeof defaultValue === "string"
					? `${name}: "${defaultValue}",`
					: `${name}: ${defaultValue},`;

			if (typeof value === "string") return `${name}: '${value}',`;
			if (value instanceof Date)
				return `${name}: new Date(${value.getTime()}),`;

			return `${name}: ${value},`;
		};

		const options = cookieMeta
			? `{
			secrets: ${
				cookieMeta.secrets !== undefined
					? typeof cookieMeta.secrets === "string"
						? `'${cookieMeta.secrets}'`
						: "[" + cookieMeta.secrets.reduce((a, b) => a + `'${b}',`, "") + "]"
					: "undefined"
			},
			sign: ${
				cookieMeta.sign === true
					? true
					: cookieMeta.sign !== undefined
						? "[" + cookieMeta.sign.reduce((a, b) => a + `'${b}',`, "") + "]"
						: "undefined"
			},
			${get("domain")}
			${get("expires")}
			${get("httpOnly")}
			${get("maxAge")}
			${get("path", "/")}
			${get("priority")}
			${get("sameSite")}
			${get("secure")}
		}`
			: "undefined";

		if (hasHeaders)
			fnLiteral += `\nc.cookie = await parseCookie(c.set, c.headers.cookie, ${options})\n`;
		else
			fnLiteral += `\nc.cookie = await parseCookie(c.set, c.request.headers.get('cookie'), ${options})\n`;
	}

	if (hasQuery) {
		const destructured = <
			{
				key: string;
				isArray: boolean;
				isNestedObjectArray: boolean;
				isObject: boolean;
				anyOf: boolean;
			}[]
		>[];

		// @ts-ignore
		if (validator.query && validator.query.schema.type === "object") {
			// @ts-expect-error private property
			const properties = validator.query.schema.properties;

			if (!hasAdditionalProperties(validator.query as any))
				// eslint-disable-next-line prefer-const
				for (let [key, _value] of Object.entries(properties)) {
					let value = _value as TAnySchema;

					// @ts-ignore
					if (
						value &&
						TypeBoxSymbol.optional in value &&
						value.type === "array" &&
						value.items
					)
						value = value.items;

					// @ts-ignore unknown
					const { type, anyOf } = value;
					const isArray =
						type === "array" ||
						anyOf?.some(
							(v: TSchema) => v.type === "string" && v.format === "ArrayString",
						);

					destructured.push({
						key,
						isArray,
						isNestedObjectArray:
							(isArray && value.items?.type === "object") ||
							!!value.items?.anyOf?.some(
								// @ts-expect-error
								(x) => x.type === "object" || x.type === "array",
							),
						isObject:
							type === "object" ||
							anyOf?.some(
								(v: TSchema) =>
									v.type === "string" && v.format === "ArrayString",
							),
						anyOf: !!anyOf,
					});
				}
		}

		if (!destructured.length) {
			fnLiteral += `if(c.qi === -1) {
				c.query = {}
			} else {
				c.query = parseQueryFromURL(c.url.slice(c.qi + 1))
			}`;
		} else {
			fnLiteral += `if(c.qi !== -1) {
				let url = '&' + c.url.slice(c.qi + 1)

				${destructured
					.map(
						({ key, isArray, isObject, isNestedObjectArray, anyOf }, index) => {
							const init = `${
								index === 0 ? "let" : ""
							} memory = url.indexOf('&${key}=')
							let a${index}\n`;

							if (isArray)
								return (
									init +
									(isNestedObjectArray
										? `while (memory !== -1) {
											const start = memory + ${key.length + 2}
											memory = url.indexOf('&', start)

											if(a${index} === undefined)
												a${index} = ''
											else
												a${index} += ','

											let temp

											if(memory === -1) temp = decodeURIComponent(url.slice(start).replace(/\\+/g, ' '))
											else temp = decodeURIComponent(url.slice(start, memory).replace(/\\+/g, ' '))

											const charCode = temp.charCodeAt(0)
											if(charCode !== 91 && charCode !== 123)
												temp = '"' + temp + '"'

											a${index} += temp

											if(memory === -1) break

											memory = url.indexOf('&${key}=', memory)
											if(memory === -1) break
										}

										try {
										    if(a${index}.charCodeAt(0) === 91)
												a${index} = JSON.parse(a${index})
											else
												a${index} = JSON.parse('[' + a${index} + ']')
										} catch {}\n`
										: `while (memory !== -1) {
											const start = memory + ${key.length + 2}
											memory = url.indexOf('&', start)

											if(a${index} === undefined)
												a${index} = []

											if(memory === -1) {
												a${index}.push(decodeURIComponent(url.slice(start)).replace(/\\+/g, ' '))
												break
											}
											else a${index}.push(decodeURIComponent(url.slice(start, memory)).replace(/\\+/g, ' '))

											memory = url.indexOf('&${key}=', memory)
											if(memory === -1) break
										}\n`)
								);

							if (isObject)
								return (
									init +
									`if (memory !== -1) {
										const start = memory + ${key.length + 2}
										memory = url.indexOf('&', start)

										if(memory === -1) a${index} = decodeURIComponent(url.slice(start).replace(/\\+/g, ' '))
										else a${index} = decodeURIComponent(url.slice(start, memory).replace(/\\+/g, ' '))

										if (a${index} !== undefined) {
											try {
												a${index} = JSON.parse(a${index})
											} catch {}
										}
									}`
								);

							// Might be union primitive and array
							return (
								init +
								`if (memory !== -1) {
										const start = memory + ${key.length + 2}
										memory = url.indexOf('&', start)

										if(memory === -1) a${index} = decodeURIComponent(url.slice(start).replace(/\\+/g, ' '))
										else {
											a${index} = decodeURIComponent(url.slice(start, memory).replace(/\\+/g, ' '))

											${
												anyOf
													? `
											let deepMemory = url.indexOf('&${key}=', memory)

											if(deepMemory !== -1) {
												a${index} = [a${index}]
												let first = true

												while(true) {
													const start = deepMemory + ${key.length + 2}
													if(first)
														first = false
													else
														deepMemory = url.indexOf('&', start)

													let value
													if(deepMemory === -1) value = decodeURIComponent(url.slice(start).replace(/\\+/g, ' '))
													else value = decodeURIComponent(url.slice(start, deepMemory).replace(/\\+/g, ' '))

													const vStart = value.charCodeAt(0)
													const vEnd = value.charCodeAt(value.length - 1)

													if((vStart === 91 && vEnd === 93) || (vStart === 123 && vEnd === 125))
														try {
															a${index}.push(JSON.parse(value))
														} catch {
														 	a${index}.push(value)
														}

													if(deepMemory === -1) break
												}
											}
												`
													: ""
											}
										}
									}`
							);
						},
					)
					.join("\n")}

				c.query = {
					${destructured.map(({ key }, index) => `'${key}': a${index}`).join(", ")}
				}
			} else {
				c.query = {}
			}`;
		}
	}

	if (hasTrace) fnLiteral += "\nconst id = c[ELYSIA_REQUEST_ID]\n";

	const report = createReport({
		trace: hooks.trace,
		addFn: (word) => {
			fnLiteral += word;
		},
	});

	fnLiteral += "\ntry {\n";
	const isAsyncHandler = typeof handler === "function" && isAsync(handler);

	const saveResponse =
		hasTrace || hooks.afterResponse.length > 0 ? "c.response = " : "";

	const maybeAsync =
		hasCookie ||
		hasBody ||
		isAsyncHandler ||
		hooks.parse.length > 0 ||
		hooks.afterHandle.some(isAsync) ||
		hooks.beforeHandle.some(isAsync) ||
		hooks.transform.some(isAsync) ||
		hooks.mapResponse.some(isAsync);

	const maybeStream =
		(typeof handler === "function" ? isGenerator(handler as any) : false) ||
		hooks.beforeHandle.some(isGenerator) ||
		hooks.afterHandle.some(isGenerator) ||
		hooks.transform.some(isGenerator);

	const hasSet =
		inference.cookie ||
		inference.set ||
		hasHeaders ||
		hasTrace ||
		validator.response ||
		(isHandleFn && hasDefaultHeaders) ||
		maybeStream;

	const requestMapper = `, c.request`;

	fnLiteral += `c.route = \`${path}\`\n`;

	const parseReporter = report("parse", {
		total: hooks.parse.length,
	});

	if (hasBody) {
		const hasBodyInference =
			hooks.parse.length || inference.body || validator.body;

		fnLiteral += "isParsing = true\n";
		if (hooks.type && !hooks.parse.length) {
			switch (hooks.type) {
				case "json":
				case "application/json":
					if (isOptional(validator.body))
						fnLiteral += `try { c.body = await c.request.json() } catch {}`;
					else fnLiteral += `c.body = await c.request.json()`;

					break;

				case "text":
				case "text/plain":
					fnLiteral += `c.body = await c.request.text()\n`;
					break;

				case "urlencoded":
				case "application/x-www-form-urlencoded":
					fnLiteral += `c.body = parseQuery(await c.request.text())\n`;
					break;

				case "arrayBuffer":
				case "application/octet-stream":
					fnLiteral += `c.body = await c.request.arrayBuffer()\n`;
					break;

				case "formdata":
				case "multipart/form-data":
					fnLiteral += `c.body = {}\n`;

					// ? If formdata body is empty, mimetype is not set, might cause an error
					if (isOptional(validator.body))
						fnLiteral += `let form; try { form = await c.request.formData() } catch {}`;
					else fnLiteral += `const form = await c.request.formData()`;

					fnLiteral += `\nif(form)
						for (const key of form.keys()) {
							if (c.body[key])
								continue

							const value = form.getAll(key)
							if (value.length === 1)
								c.body[key] = value[0]
							else c.body[key] = value
						} else form = {}\n`;
					break;
			}
		} else if (hasBodyInference) {
			fnLiteral += "\n";
			fnLiteral += hasHeaders
				? `let contentType = c.headers['content-type']`
				: `let contentType = c.request.headers.get('content-type')`;

			fnLiteral += `
				if (contentType) {
					const index = contentType.indexOf(';')
					if (index !== -1) contentType = contentType.substring(0, index)\n
					c.contentType = contentType\n`;

			if (hooks.parse.length) {
				fnLiteral += `let used = false\n`;

				const reporter = report("parse", {
					total: hooks.parse.length,
				});

				for (let i = 0; i < hooks.parse.length; i++) {
					const endUnit = reporter.resolveChild(hooks.parse[i].fn.name);

					const name = `bo${i}`;

					if (i !== 0) fnLiteral += `if(!used) {\n`;

					fnLiteral += `let ${name} = parse[${i}](c, contentType)\n`;
					fnLiteral += `if(${name} instanceof Promise) ${name} = await ${name}\n`;
					fnLiteral += `if(${name} !== undefined) { c.body = ${name}; used = true }\n`;

					endUnit();

					if (i !== 0) fnLiteral += `}`;
				}

				reporter.resolve();
			}

			fnLiteral += "\ndelete c.contentType\n";

			if (hooks.parse.length) fnLiteral += `if (!used) {`;

			if (hooks.type && !Array.isArray(hooks.type)) {
				switch (hooks.type) {
					case "json":
					case "application/json":
						if (isOptional(validator.body))
							fnLiteral += `try { c.body = await c.request.json() } catch {}`;
						else fnLiteral += `c.body = await c.request.json()`;
						break;

					case "text":
					case "text/plain":
						fnLiteral += `c.body = await c.request.text()\n`;
						break;

					case "urlencoded":
					case "application/x-www-form-urlencoded":
						fnLiteral += `c.body = parseQuery(await c.request.text())\n`;
						break;

					case "arrayBuffer":
					case "application/octet-stream":
						fnLiteral += `c.body = await c.request.arrayBuffer()\n`;
						break;

					case "formdata":
					case "multipart/form-data":
						fnLiteral += `c.body = {}

							const form = await c.request.formData()
							for (const key of form.keys()) {
								if (c.body[key])
									continue

								const value = form.getAll(key)
								if (value.length === 1)
									c.body[key] = value[0]
								else c.body[key] = value
							}\n`;
						break;
				}
			} else {
				fnLiteral += `
					switch (contentType) {
						case 'application/json':
							${isOptional(validator.body) ? "try { c.body = await c.request.json() } catch {}" : "c.body = await c.request.json()"}
							break

						case 'text/plain':
							c.body = await c.request.text()
							break

						case 'application/x-www-form-urlencoded':
							c.body = parseQuery(await c.request.text())
							break

						case 'application/octet-stream':
							c.body = await c.request.arrayBuffer();
							break

						case 'multipart/form-data':
							c.body = {}

							const form = await c.request.formData()
							for (const key of form.keys()) {
								if (c.body[key])
									continue

								const value = form.getAll(key)
								if (value.length === 1)
									c.body[key] = value[0]
								else c.body[key] = value
							}

							break
					}`;
			}

			if (hooks.parse.length) fnLiteral += `}`;

			fnLiteral += "}\n";
		}

		fnLiteral += "\nisParsing = false\n";
	}

	parseReporter.resolve();

	if (hooks?.transform) {
		const reporter = report("transform", {
			total: hooks.transform.length,
		});

		if (hooks.transform.length) fnLiteral += "\nlet transformed\n";

		for (let i = 0; i < hooks.transform.length; i++) {
			const transform = hooks.transform[i];

			const endUnit = reporter.resolveChild(transform.fn.name);

			fnLiteral += isAsync(transform)
				? `transformed = await transform[${i}](c)\n`
				: `transformed = transform[${i}](c)\n`;

			if (transform.subType === "mapDerive")
				fnLiteral += `if(transformed instanceof ElysiaCustomStatusResponse)
					throw transformed
				else {
					transformed.request = c.request
					transformed.store = c.store
					transformed.qi = c.qi
					transformed.path = c.path
					transformed.url = c.url
					transformed.redirect = c.redirect
					transformed.set = c.set
					transformed.error = c.error

					c = transformed
			}`;
			else
				fnLiteral += `if(transformed instanceof ElysiaCustomStatusResponse)
					throw transformed
				else
					Object.assign(c, transformed)\n`;

			endUnit();
		}

		reporter.resolve();
	}

	if (validator) {
		fnLiteral += "\n";

		if (validator.headers) {
			if (
				normalize &&
				"Clean" in validator.headers &&
				!hasAdditionalProperties(validator.headers as any)
			)
				fnLiteral += "c.headers = validator.headers.Clean(c.headers);\n";

			// @ts-ignore
			if (hasProperty("default", validator.headers.schema))
				for (const [key, value] of Object.entries(
					Value.Default(
						// @ts-ignore
						validator.headers.schema,
						{},
					) as Object,
				)) {
					const parsed =
						typeof value === "object"
							? JSON.stringify(value)
							: typeof value === "string"
								? `'${value}'`
								: value;

					if (parsed !== undefined)
						fnLiteral += `c.headers['${key}'] ??= ${parsed}\n`;
				}

			if (isOptional(validator.headers))
				fnLiteral += `if(isNotEmpty(c.headers)) {`;

			fnLiteral += `if(validator.headers.Check(c.headers) === false) {
				${composeValidation("headers")}
			}`;

			// @ts-expect-error private property
			if (hasTransform(validator.headers.schema))
				fnLiteral += `c.headers = validator.headers.Decode(c.headers)\n`;

			if (isOptional(validator.headers)) fnLiteral += "}";
		}

		if (validator.params) {
			// @ts-ignore
			if (hasProperty("default", validator.params.schema))
				for (const [key, value] of Object.entries(
					Value.Default(
						// @ts-ignore
						validator.params.schema,
						{},
					) as Object,
				)) {
					const parsed =
						typeof value === "object"
							? JSON.stringify(value)
							: typeof value === "string"
								? `'${value}'`
								: value;

					if (parsed !== undefined)
						fnLiteral += `c.params['${key}'] ??= ${parsed}\n`;
				}

			fnLiteral += `if(validator.params.Check(c.params) === false) {
				${composeValidation("params")}
			}`;

			// @ts-expect-error private property
			if (hasTransform(validator.params.schema))
				fnLiteral += `\nc.params = validator.params.Decode(c.params)\n`;
		}

		if (validator.query) {
			if (
				normalize &&
				"Clean" in validator.query &&
				!hasAdditionalProperties(validator.query as any)
			)
				fnLiteral += "c.query = validator.query.Clean(c.query);\n";

			// @ts-ignore
			if (hasProperty("default", validator.query.schema))
				for (const [key, value] of Object.entries(
					Value.Default(
						// @ts-ignore
						validator.query.schema,
						{},
					) as Object,
				)) {
					const parsed =
						typeof value === "object"
							? JSON.stringify(value)
							: typeof value === "string"
								? `'${value}'`
								: value;

					if (parsed !== undefined)
						fnLiteral += `if(c.query['${key}'] === undefined) c.query['${key}'] = ${parsed}\n`;
				}

			if (isOptional(validator.query)) fnLiteral += `if(isNotEmpty(c.query)) {`;

			fnLiteral += `if(validator.query.Check(c.query) === false) {
          		${composeValidation("query")}
			}`;

			// @ts-expect-error private property
			if (hasTransform(validator.query.schema))
				fnLiteral += `\nc.query = validator.query.Decode(Object.assign({}, c.query))\n`;

			if (isOptional(validator.query)) fnLiteral += `}`;
		}

		if (validator.body) {
			if (
				normalize &&
				"Clean" in validator.body &&
				!hasAdditionalProperties(validator.body as any)
			)
				fnLiteral += "c.body = validator.body.Clean(c.body);\n";

			// @ts-expect-error private property
			const doesHaveTransform = hasTransform(validator.body.schema);

			if (doesHaveTransform || isOptional(validator.body))
				fnLiteral += `\nconst isNotEmptyObject = c.body && (typeof c.body === "object" && isNotEmpty(c.body))\n`;

			// @ts-ignore
			if (hasProperty("default", validator.body.schema)) {
				const value = Value.Default(
					// @ts-expect-error private property
					validator.body.schema,
					// @ts-expect-error private property
					validator.body.schema.type === "object" ? {} : undefined,
				);

				const parsed =
					typeof value === "object"
						? JSON.stringify(value)
						: typeof value === "string"
							? `'${value}'`
							: value;

				fnLiteral += `if(validator.body.Check(c.body) === false) {
					if (typeof c.body === 'object') {
						c.body = Object.assign(${parsed}, c.body)
					} else { c.body = ${parsed} }`;

				if (isOptional(validator.body))
					fnLiteral += `
					    if(isNotEmptyObject && validator.body.Check(c.body) === false) {
            				${composeValidation("body")}
             			}
                    }`;
				else
					fnLiteral += `
    				if(validator.body.Check(c.body) === false) {
        				${composeValidation("body")}
         			}
                }`;
			} else {
				if (isOptional(validator.body))
					fnLiteral += `if(isNotEmptyObject && validator.body.Check(c.body) === false) {
         			${composeValidation("body")}
          		}`;
				else
					fnLiteral += `if(validator.body.Check(c.body) === false) {
         			${composeValidation("body")}
          		}`;
			}

			if (doesHaveTransform)
				fnLiteral += `\nif(isNotEmptyObject) c.body = validator.body.Decode(c.body)\n`;
		}

		if (
			isNotEmpty(
				// @ts-ignore
				cookieValidator?.schema?.properties ??
					// @ts-ignore
					cookieValidator?.schema?.schema ??
					{},
			)
		) {
			fnLiteral += `const cookieValue = {}
    			for(const [key, value] of Object.entries(c.cookie))
    				cookieValue[key] = value.value\n`;

			// @ts-ignore
			if (hasProperty("default", cookieValidator.schema))
				for (const [key, value] of Object.entries(
					Value.Default(
						// @ts-ignore
						cookieValidator.schema,
						{},
					) as Object,
				)) {
					fnLiteral += `cookieValue['${key}'] = ${
						typeof value === "object" ? JSON.stringify(value) : value
					}\n`;
				}

			if (isOptional(validator.cookie))
				fnLiteral += `if(isNotEmpty(c.cookie)) {`;

			fnLiteral += `if(validator.cookie.Check(cookieValue) === false) {
				${composeValidation("cookie", "cookieValue")}
			}`;

			// @ts-expect-error private property
			if (hasTransform(validator.cookie.schema))
				fnLiteral += `\nfor(const [key, value] of Object.entries(validator.cookie.Decode(cookieValue)))
					c.cookie[key].value = value\n`;

			if (isOptional(validator.cookie)) fnLiteral += `}`;
		}
	}

	if (hooks?.beforeHandle) {
		const reporter = report("beforeHandle", {
			total: hooks.beforeHandle.length,
		});

		let hasResolve = false;

		for (let i = 0; i < hooks.beforeHandle.length; i++) {
			const beforeHandle = hooks.beforeHandle[i];

			const endUnit = reporter.resolveChild(beforeHandle.fn.name);

			const returning = hasReturn(beforeHandle);
			const isResolver =
				beforeHandle.subType === "resolve" ||
				beforeHandle.subType === "mapResolve";

			if (isResolver) {
				if (!hasResolve) {
					hasResolve = true;
					fnLiteral += "\nlet resolved\n";
				}

				fnLiteral += isAsync(beforeHandle)
					? `resolved = await beforeHandle[${i}](c);\n`
					: `resolved = beforeHandle[${i}](c);\n`;

				if (beforeHandle.subType === "mapResolve")
					fnLiteral += `if(resolved instanceof ElysiaCustomStatusResponse)
						throw resolved
					else {
						resolved.request = c.request
						resolved.store = c.store
						resolved.qi = c.qi
						resolved.path = c.path
						resolved.url = c.url
						resolved.redirect = c.redirect
						resolved.set = c.set
						resolved.error = c.error

						c = resolved
					}`;
				else
					fnLiteral += `if(resolved instanceof ElysiaCustomStatusResponse)
						throw resolved
					else
						Object.assign(c, resolved)\n`;
			} else if (!returning) {
				fnLiteral += isAsync(beforeHandle)
					? `await beforeHandle[${i}](c);\n`
					: `beforeHandle[${i}](c);\n`;

				endUnit();
			} else {
				fnLiteral += isAsync(beforeHandle)
					? `be = await beforeHandle[${i}](c);\n`
					: `be = beforeHandle[${i}](c);\n`;

				endUnit("be");

				fnLiteral += `if(be !== undefined) {\n`;
				reporter.resolve();

				if (hooks.afterHandle?.length) {
					report("handle", {
						name: isHandleFn ? (handler as Function).name : undefined,
					}).resolve();

					const reporter = report("afterHandle", {
						total: hooks.afterHandle.length,
					});

					for (let i = 0; i < hooks.afterHandle.length; i++) {
						const hook = hooks.afterHandle[i];
						const returning = hasReturn(hook);
						const endUnit = reporter.resolveChild(hook.fn.name);

						fnLiteral += `c.response = be\n`;

						if (!returning) {
							fnLiteral += isAsync(hook.fn)
								? `await afterHandle[${i}](c, be)\n`
								: `afterHandle[${i}](c, be)\n`;
						} else {
							fnLiteral += isAsync(hook.fn)
								? `af = await afterHandle[${i}](c)\n`
								: `af = afterHandle[${i}](c)\n`;

							fnLiteral += `if(af !== undefined) { c.response = be = af }\n`;
						}

						endUnit("af");
					}
					reporter.resolve();
				}

				if (validator.response) fnLiteral += composeResponseValidation("be");

				const mapResponseReporter = report("mapResponse", {
					total: hooks.mapResponse.length,
				});

				if (hooks.mapResponse.length) {
					fnLiteral += `\nc.response = be\n`;

					for (let i = 0; i < hooks.mapResponse.length; i++) {
						const mapResponse = hooks.mapResponse[i];

						const endUnit = mapResponseReporter.resolveChild(
							mapResponse.fn.name,
						);

						fnLiteral += `\nif(mr === undefined) {
							mr = ${isAsyncName(mapResponse) ? "await" : ""} onMapResponse[${i}](c)
							if(mr !== undefined) be = c.response = mr
						}\n`;

						endUnit();
					}
				}

				mapResponseReporter.resolve();

				fnLiteral += encodeCookie;
				fnLiteral += `return mapEarlyResponse(${saveResponse} be, c.set ${requestMapper})}\n`;
			}
		}

		reporter.resolve();
	}

	if (hooks?.afterHandle.length) {
		const handleReporter = report("handle", {
			name: isHandleFn ? (handler as Function).name : undefined,
		});

		if (hooks.afterHandle.length)
			fnLiteral += isAsyncHandler
				? `let r = c.response = await ${handle};\n`
				: `let r = c.response = ${handle};\n`;
		else
			fnLiteral += isAsyncHandler
				? `let r = await ${handle};\n`
				: `let r = ${handle};\n`;

		handleReporter.resolve();

		const reporter = report("afterHandle", {
			total: hooks.afterHandle.length,
		});

		for (let i = 0; i < hooks.afterHandle.length; i++) {
			const hook = hooks.afterHandle[i];
			const returning = hasReturn(hook);
			const endUnit = reporter.resolveChild(hook.fn.name);

			if (!returning) {
				fnLiteral += isAsync(hook.fn)
					? `await afterHandle[${i}](c)\n`
					: `afterHandle[${i}](c)\n`;

				endUnit();
			} else {
				fnLiteral += isAsync(hook.fn)
					? `af = await afterHandle[${i}](c)\n`
					: `af = afterHandle[${i}](c)\n`;

				endUnit("af");

				if (validator.response) {
					fnLiteral += `if(af !== undefined) {`;
					reporter.resolve();

					fnLiteral += composeResponseValidation("af");

					fnLiteral += `c.response = af }`;
				} else {
					fnLiteral += `if(af !== undefined) {`;
					reporter.resolve();

					fnLiteral += `c.response = af}\n`;
				}
			}
		}

		reporter.resolve();

		fnLiteral += `r = c.response\n`;

		if (validator.response) fnLiteral += composeResponseValidation();

		fnLiteral += encodeCookie;

		const mapResponseReporter = report("mapResponse", {
			total: hooks.mapResponse.length,
		});
		if (hooks.mapResponse.length) {
			for (let i = 0; i < hooks.mapResponse.length; i++) {
				const mapResponse = hooks.mapResponse[i];

				const endUnit = mapResponseReporter.resolveChild(mapResponse.fn.name);

				fnLiteral += `\nmr = ${
					isAsyncName(mapResponse) ? "await" : ""
				} onMapResponse[${i}](c)
				if(mr !== undefined) r = c.response = mr\n`;

				endUnit();
			}
		}
		mapResponseReporter.resolve();

		if (hasSet)
			fnLiteral += `return mapResponse(${saveResponse} r, c.set ${requestMapper})\n`;
		else
			fnLiteral += `return mapCompactResponse(${saveResponse} r ${requestMapper})\n`;
	} else {
		const handleReporter = report("handle", {
			name: isHandleFn ? (handler as Function).name : undefined,
		});

		if (validator.response || hooks.mapResponse.length) {
			fnLiteral += isAsyncHandler
				? `let r = await ${handle};\n`
				: `let r = ${handle};\n`;

			handleReporter.resolve();

			if (validator.response) fnLiteral += composeResponseValidation();

			report("afterHandle").resolve();

			const mapResponseReporter = report("mapResponse", {
				total: hooks.mapResponse.length,
			});

			if (hooks.mapResponse.length) {
				fnLiteral += "\nc.response = r\n";

				for (let i = 0; i < hooks.mapResponse.length; i++) {
					const mapResponse = hooks.mapResponse[i];

					const endUnit = mapResponseReporter.resolveChild(mapResponse.fn.name);

					fnLiteral += `\nif(mr === undefined) {
						mr = ${isAsyncName(mapResponse) ? "await" : ""} onMapResponse[${i}](c)
    					if(mr !== undefined) r = c.response = mr
					}\n`;

					endUnit();
				}
			}
			mapResponseReporter.resolve();

			fnLiteral += encodeCookie;

			if (handler instanceof Response) {
				fnLiteral += inference.set
					? `if(
					isNotEmpty(c.set.headers) ||
					c.set.status !== 200 ||
					c.set.redirect ||
					c.set.cookie
				)
					return mapResponse(${saveResponse} ${handle}.clone(), c.set ${requestMapper})
				else
					return ${handle}.clone()`
					: `return ${handle}.clone()`;

				fnLiteral += "\n";
			} else if (hasSet)
				fnLiteral += `return mapResponse(${saveResponse} r, c.set ${requestMapper})\n`;
			else
				fnLiteral += `return mapCompactResponse(${saveResponse} r ${requestMapper})\n`;
		} else if (hasCookie || hasTrace) {
			fnLiteral += isAsyncHandler
				? `let r = await ${handle};\n`
				: `let r = ${handle};\n`;

			handleReporter.resolve();

			report("afterHandle").resolve();

			const mapResponseReporter = report("mapResponse", {
				total: hooks.mapResponse.length,
			});
			if (hooks.mapResponse.length) {
				fnLiteral += "\nc.response = r\n";

				for (let i = 0; i < hooks.mapResponse.length; i++) {
					const mapResponse = hooks.mapResponse[i];

					const endUnit = mapResponseReporter.resolveChild(mapResponse.fn.name);

					fnLiteral += `\nif(mr === undefined) {
							mr = ${isAsyncName(mapResponse) ? "await" : ""} onMapResponse[${i}](c)
    						if(mr !== undefined) r = c.response = mr
						}\n`;

					endUnit();
				}
			}
			mapResponseReporter.resolve();

			fnLiteral += encodeCookie;

			if (hasSet)
				fnLiteral += `return mapResponse(${saveResponse} r, c.set ${requestMapper})\n`;
			else
				fnLiteral += `return mapCompactResponse(${saveResponse} r ${requestMapper})\n`;
		} else {
			handleReporter.resolve();

			const handled = isAsyncHandler ? `await ${handle}` : handle;

			report("afterHandle").resolve();

			if (handler instanceof Response) {
				fnLiteral += inference.set
					? `if(
					isNotEmpty(c.set.headers) ||
					c.set.status !== 200 ||
					c.set.redirect ||
					c.set.cookie
				)
					return mapResponse(${saveResponse} ${handle}.clone(), c.set ${requestMapper})
				else
					return ${handle}.clone()`
					: `return ${handle}.clone()`;

				fnLiteral += "\n";
			} else if (hasSet)
				fnLiteral += `return mapResponse(${saveResponse} ${handled}, c.set ${requestMapper})\n`;
			else
				fnLiteral += `return mapCompactResponse(${saveResponse} ${handled} ${requestMapper})\n`;
		}
	}

	fnLiteral += `\n} catch(error) {`;

	if (hasBody) fnLiteral += `\nif(isParsing) error = new ParseError()\n`;

	if (!maybeAsync) fnLiteral += `\nreturn (async () => {\n`;
	fnLiteral += `\nconst set = c.set\nif (!set.status || set.status < 300) set.status = error?.status || 500\n`;

	if (hasTrace)
		for (let i = 0; i < hooks.trace.length; i++)
			// There's a case where the error is thrown before any trace is called
			fnLiteral += `report${i}?.resolve(error);reportChild${i}?.(error);\n`;

	const errorReporter = report("error", {
		total: hooks.error.length,
	});

	if (hooks.error.length) {
		fnLiteral += `
				c.error = error
				if(error instanceof TypeBoxError) {
					c.code = "VALIDATION"
					c.set.status = 422
				} else
					c.code = error.code ?? error[ERROR_CODE] ?? "UNKNOWN"
				let er
			`;

		for (let i = 0; i < hooks.error.length; i++) {
			const endUnit = errorReporter.resolveChild(hooks.error[i].fn.name);

			if (isAsync(hooks.error[i]))
				fnLiteral += `\ner = await handleErrors[${i}](c)\n`;
			else
				fnLiteral +=
					`\ner = handleErrors[${i}](c)\n` +
					`if (er instanceof Promise) er = await er\n`;

			endUnit();

			const mapResponseReporter = report("mapResponse", {
				total: hooks.mapResponse.length,
			});

			if (hooks.mapResponse.length) {
				for (let i = 0; i < hooks.mapResponse.length; i++) {
					const mapResponse = hooks.mapResponse[i];

					const endUnit = mapResponseReporter.resolveChild(mapResponse.fn.name);

					fnLiteral += `\nc.response = er\n
							er = ${isAsyncName(mapResponse) ? "await" : ""} onMapResponse[${i}](c)
							if(er instanceof Promise) er = await er\n`;

					endUnit();
				}
			}

			mapResponseReporter.resolve();

			fnLiteral += `er = mapEarlyResponse(er, set ${requestMapper})\n`;
			fnLiteral += `if (er) {`;

			if (hasTrace) {
				for (let i = 0; i < hooks.trace.length; i++)
					fnLiteral += `\nreport${i}.resolve()\n`;

				errorReporter.resolve();
			}

			fnLiteral += `return er\n}\n`;
		}
	}

	errorReporter.resolve();

	fnLiteral += `return handleError(c, error, true)\n`;
	if (!maybeAsync) fnLiteral += "})()";
	fnLiteral += "}";

	if (hasAfterResponse || hasTrace) {
		fnLiteral += ` finally { `;

		if (!maybeAsync) fnLiteral += ";(async () => {";

		const reporter = report("afterResponse", {
			total: hooks.afterResponse.length,
		});

		if (hasAfterResponse) {
			for (let i = 0; i < hooks.afterResponse.length; i++) {
				const endUnit = reporter.resolveChild(hooks.afterResponse[i].fn.name);
				fnLiteral += `\nawait afterResponse[${i}](c);\n`;
				endUnit();
			}
		}

		reporter.resolve();

		if (!maybeAsync) fnLiteral += "})();";

		fnLiteral += `}`;
	}

	fnLiteral = `const {
		handler,
		handleError,
		hooks: {
			transform,
			resolve,
			beforeHandle,
			afterHandle,
			mapResponse: onMapResponse,
			parse,
			error: handleErrors,
			afterResponse,
			trace: _trace
		},
		validator,
		utils: {
			mapResponse,
			mapCompactResponse,
			mapEarlyResponse,
			parseQuery,
			parseQueryFromURL,
			isNotEmpty
		},
		error: {
			NotFoundError,
			ValidationError,
			InternalServerError,
			ParseError
		},
		schema,
		definitions,
		ERROR_CODE,
		parseCookie,
		signCookie,
		decodeURIComponent,
		ElysiaCustomStatusResponse,
		ELYSIA_TRACE,
		ELYSIA_REQUEST_ID,
		getServer,
		TypeBoxError
	} = hooks

	const trace = _trace.map(x => typeof x === 'function' ? x : x.fn)

	return ${maybeAsync ? "async" : ""} function handle(c) {
		${hooks.beforeHandle.length ? "let be" : ""}
		${hooks.afterHandle.length ? "let af" : ""}
		${hooks.mapResponse.length ? "let mr" : ""}

		${allowMeta ? "c.schema = schema; c.defs = definitions" : ""}
		${fnLiteral}
	}`;

	try {
		return Function(
			"hooks",
			fnLiteral,
		)({
			handler,
			hooks: lifeCycleToFn(hooks),
			validator,
			// @ts-expect-error
			handleError: app.handleError,
			utils: {
				mapResponse,
				mapCompactResponse,
				mapEarlyResponse,
				parseQuery,
				parseQueryFromURL,
				isNotEmpty,
			},
			error: {
				NotFoundError,
				ValidationError,
				InternalServerError,
				ParseError,
			},
			schema: app.router.history,
			// @ts-expect-error
			definitions: app.definitions.type,
			ERROR_CODE,
			parseCookie,
			signCookie,
			decodeURIComponent,
			ElysiaCustomStatusResponse,
			ELYSIA_TRACE,
			ELYSIA_REQUEST_ID,
			// @ts-expect-error private property
			getServer: () => app.getServer(),
			TypeBoxError,
		});
	} catch {
		const debugHooks = lifeCycleToFn(hooks);

		console.log("[Composer] failed to generate optimized handler");
		console.log(
			"Please report the following to SaltyAom privately as it may include sensitive information about your codebase:",
		);
		console.log("---");
		console.log({
			handler: typeof handler === "function" ? handler.toString() : handler,
			hooks: {
				...debugHooks,
				// @ts-expect-error
				transform: debugHooks?.transform?.map?.((x) => x.toString()),
				// @ts-expect-error
				resolve: debugHooks?.resolve?.map?.((x) => x.toString()),
				// @ts-expect-error
				beforeHandle: debugHooks?.beforeHandle?.map?.((x) => x.toString()),
				// @ts-expect-error
				afterHandle: debugHooks?.afterHandle?.map?.((x) => x.toString()),
				// @ts-expect-error
				mapResponse: debugHooks?.mapResponse?.map?.((x) => x.toString()),
				// @ts-expect-error
				parse: debugHooks?.parse?.map?.((x) => x.toString()),
				// @ts-expect-error
				error: debugHooks?.error?.map?.((x) => x.toString()),
				// @ts-expect-error
				afterResponse: debugHooks?.afterResponse?.map?.((x) => x.toString()),
				// @ts-expect-error
				stop: debugHooks?.stop?.map?.((x) => x.toString()),
			},
			validator,
			// @ts-expect-error
			definitions: app.definitions.type,
		});
		console.log("---");

		process.exit(1);
	}
};
