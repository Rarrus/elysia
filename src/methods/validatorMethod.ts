export default function  validatorMethod() =
	this.config.precompile === true ||
	(typeof this.config.precompile === 'object' &&
		this.config.precompile.schema === true)
		? {
				body: getSchemaValidator(cloned.body, {
					dynamic,
					models,
					normalize,
					additionalCoerce: coercePrimitiveRoot()
				}),
				headers: getSchemaValidator(cloned.headers, {
					dynamic,
					models,
					additionalProperties: !this.config.normalize,
					coerce: true,
					additionalCoerce: stringToStructureCoercions()
				}),
				params: getSchemaValidator(cloned.params, {
					dynamic,
					models,
					coerce: true,
					additionalCoerce: stringToStructureCoercions()
				}),
				query: getSchemaValidator(cloned.query, {
					dynamic,
					models,
					normalize,
					coerce: true,
					additionalCoerce: stringToStructureCoercions()
				}),
				cookie: cookieValidator(),
				response: getResponseSchemaValidator(cloned.response, {
					dynamic,
					models,
					normalize
				})
			}
		: ({
				createBody() {
					if (this.body) return this.body

					return (this.body = getSchemaValidator(cloned.body, {
						dynamic,
						models,
						normalize,
						additionalCoerce: coercePrimitiveRoot()
					}))
				},
				createHeaders() {
					if (this.headers) return this.headers

					return (this.headers = getSchemaValidator(cloned.headers, {
						dynamic,
						models,
						additionalProperties: !normalize,
						coerce: true,
						additionalCoerce: stringToStructureCoercions()
					}))
				},
				createParams() {
					if (this.params) return this.params

					return (this.params = getSchemaValidator(cloned.params, {
						dynamic,
						models,
						coerce: true,
						additionalCoerce: stringToStructureCoercions()
					}))
				},
				createQuery() {
					if (this.query) return this.query

					return (this.query = getSchemaValidator(cloned.query, {
						dynamic,
						models,
						coerce: true,
						additionalCoerce: stringToStructureCoercions()
					}))
				},
				createCookie() {
					if (this.cookie) return this.cookie

					return (this.cookie = cookieValidator())
				},
				createResponse() {
					if (this.response) return this.response

					return (this.response = getResponseSchemaValidator(
						cloned.response,
						{
							dynamic,
							models,
							normalize
						}
					))
				}
			} as any)
