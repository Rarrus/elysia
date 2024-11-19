export const error = <
	const Code extends number | keyof StatusMap,
	const T = Code extends keyof InvertedStatusMap
		? InvertedStatusMap[Code]
		: Code,
>(
	code: Code,
	response?: T,
) => new ElysiaCustomStatusResponse<Code, T>(code, response as any);
export const mapValueError = (error: ValueError | undefined) => {
	if (!error)
		return {
			summary: undefined,
		};

	const { message, path, value, type } = error;

	const property = path.slice(1).replaceAll("/", ".");
	const isRoot = path === "";

	switch (type) {
		case 42:
			return {
				...error,
				summary: isRoot
					? `Value should not be provided`
					: `Property '${property}' should not be provided`,
			};

		case 45:
			return {
				...error,
				summary: isRoot
					? `Value is missing`
					: `Property '${property}' is missing`,
			};

		case 50:
			// Expected string to match 'email' format
			const quoteIndex = message.indexOf("'")!;
			const format = message.slice(
				quoteIndex + 1,
				message.indexOf("'", quoteIndex + 1),
			);

			return {
				...error,
				summary: isRoot
					? `Value should be an email`
					: `Property '${property}' should be ${format}`,
			};

		case 54:
			return {
				...error,
				summary: `${message.slice(
					0,
					9,
				)} property '${property}' to be ${message.slice(
					8,
				)} but found: ${value}`,
			};

		case 62:
			const union = error.schema.anyOf
				.map((x: Record<string, unknown>) => `'${x?.format ?? x.type}'`)
				.join(", ");

			return {
				...error,
				summary: isRoot
					? `Value should be one of ${union}`
					: `Property '${property}' should be one of: ${union}`,
			};

		default:
			return { summary: message, ...error };
	}
};
