export const createStaticHandler = (
	handle: unknown,
	hooks: LocalHook<any, any, any, any, any, any, any>,
	setHeaders: Context["set"]["headers"] = {},
): (() => Response) | undefined => {
	if (typeof handle === "function") return;

	const response = mapResponse(handle, {
		headers: setHeaders,
	});

	if (
		hooks.parse.length === 0 &&
		hooks.transform.length === 0 &&
		hooks.beforeHandle.length === 0 &&
		hooks.afterHandle.length === 0
	)
		return response.clone.bind(response);
};
