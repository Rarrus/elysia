export const createCookieJar = (
	set: Context["set"],
	store: Record<string, ElysiaCookie>,
	initial?: Partial<ElysiaCookie>,
): Record<string, Cookie<unknown>> => {
	if (!set.cookie) set.cookie = {};

	return new Proxy(store, {
		get(_, key: string) {
			if (key in store)
				return new Cookie(
					key,
					set.cookie as Record<string, ElysiaCookie>,
					Object.assign({}, initial ?? {}, store[key]),
				);

			return new Cookie(
				key,
				set.cookie as Record<string, ElysiaCookie>,
				Object.assign({}, initial),
			);
		},
	}) as Record<string, Cookie<unknown>>;
};
