export const createDynamicErrorHandler =
	(app: Elysia<any, any, any, any, any, any, any, any>) =>
	async (
		context: Context & {
			response: unknown;
		},
		error: ElysiaErrors,
	) => {
		const errorContext = Object.assign(context, { error, code: error.code });
		errorContext.set = context.set;

		for (let i = 0; i < app.event.error.length; i++) {
			const hook = app.event.error[i];
			let response = hook.fn(errorContext as any);
			if (response instanceof Promise) response = await response;
			if (response !== undefined && response !== null)
				return (context.response = mapResponse(response, context.set));
		}

		return new Response(
			typeof error.cause === "string" ? error.cause : error.message,
			{
				headers: context.set.headers,
				status: error.status ?? 500,
			},
		);
	};
