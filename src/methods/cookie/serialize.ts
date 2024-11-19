export const serializeCookie = (cookies: Context["set"]["cookie"]) => {
	if (!cookies || !isNotEmpty(cookies)) return undefined;

	const set: string[] = [];

	for (const [key, property] of Object.entries(cookies)) {
		if (!key || !property) continue;

		const value = property.value;
		if (value === undefined || value === null) continue;

		set.push(
			serialize(
				key,
				typeof value === "object" ? JSON.stringify(value) : value + "",
				property,
			),
		);
	}

	if (set.length === 0) return undefined;
	if (set.length === 1) return set[0];

	return set;
};
