export default  function handleError = async (
	context: Partial<
		Context<
			MergeSchema<
				Metadata['schema'],
				MergeSchema<Ephemeral['schema'], Volatile['schema']>
			>,
			Singleton & {
			derive: Ephemeral['derive'] & Volatile['derive']
			resolve: Ephemeral['resolve'] & Volatile['resolve']
		},
			BasePath
		>
	> & {
		request: Request
	},
	error:
		| Error
		| ValidationError
		| ParseError
		| NotFoundError
		| InternalServerError
) =>
	(this.handleError = this.config.aot
		? composeErrorHandler(this)
		: createDynamicErrorHandler(this))(context, error)
