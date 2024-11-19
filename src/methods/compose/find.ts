/**
 * Find inference from parameter
 *
 * @param parameter stringified parameter
 */
export const findParameterReference = (
	parameter: string,
	inference: Sucrose.Inference,
) => {
	const { parameters, hasParenthesis } = retrieveRootParamters(parameter);

	// Check if root is an object destructuring
	if (!inference.query && parameters.includes("query")) inference.query = true;
	if (!inference.headers && parameters.includes("headers"))
		inference.headers = true;
	if (!inference.body && parameters.includes("body")) inference.body = true;
	if (!inference.cookie && parameters.includes("cookie"))
		inference.cookie = true;
	if (!inference.set && parameters.includes("set")) inference.set = true;
	if (!inference.server && parameters.includes("server"))
		inference.server = true;

	if (hasParenthesis) return `{ ${parameters.join(", ")} }`;

	return parameters.join(", ");
};

const findEndIndex = (
	type: string,
	content: string,
	index?: number | undefined,
) => {
	const newLineIndex = content.indexOf(type + "\n", index);
	const newTabIndex = content.indexOf(type + "\t", index);
	const commaIndex = content.indexOf(type + ",", index);
	const semicolonIndex = content.indexOf(type + ";", index);
	const emptyIndex = content.indexOf(type + " ", index);

	// Pick the smallest index that is not -1 or 0
	return (
		[newLineIndex, newTabIndex, commaIndex, semicolonIndex, emptyIndex]
			.filter((i) => i > 0)
			.sort((a, b) => a - b)[0] || -1
	);
};

const findEndQueryBracketIndex = (
	type: string,
	content: string,
	index?: number | undefined,
) => {
	const bracketEndIndex = content.indexOf(type + "]", index);
	const singleQuoteIndex = content.indexOf(type + "'", index);
	const doubleQuoteIndex = content.indexOf(type + '"', index);

	// Pick the smallest index that is not -1 or 0
	return (
		[bracketEndIndex, singleQuoteIndex, doubleQuoteIndex]
			.filter((i) => i > 0)
			.sort((a, b) => a - b)[0] || -1
	);
};

/**
 * Find alias of variable from function body
 *
 * @example
 * ```typescript
 * findAlias('body', '{ const a = body, b = body }') // => ['a', 'b']
 * ```
 */
export const findAlias = (type: string, body: string, depth = 0) => {
	if (depth > 5) return [];

	const aliases: string[] = [];

	let content = body;

	while (true) {
		let index = findEndIndex(" = " + type, content);

		if (index === -1) {
			/**
			 * Check if pattern is at the end of the string
			 *
			 * @example
			 * ```typescript
			 * 'const a = body' // true
			 * ```
			 **/
			const lastIndex = content.indexOf(" = " + type);

			if (lastIndex + 3 + type.length !== content.length) break;

			index = lastIndex;
		}

		const part = content.slice(0, index);
		/**
		 * aliased variable last character
		 *
		 * @example
		 * ```typescript
		 * const { hello } = body // } is the last character
		 * ```
		 **/
		let variable = part.slice(part.lastIndexOf(" ") + 1);

		// Variable is using object destructuring, find the bracket pair
		if (variable === "}") {
			const [start, end] = bracketPairRangeReverse(part);

			aliases.push(removeColonAlias(content.slice(start, end)));

			content = content.slice(index + 3 + type.length);

			continue;
		}

		// Remove comma
		while (variable.charCodeAt(0) === 44) variable = variable.slice(1);
		while (variable.charCodeAt(0) === 9) variable = variable.slice(1);

		if (!variable.includes("(")) aliases.push(variable);

		content = content.slice(index + 3 + type.length);
	}

	for (const alias of aliases) {
		if (alias.charCodeAt(0) === 123) continue;

		const deepAlias = findAlias(alias, body);
		if (deepAlias.length > 0) aliases.push(...deepAlias);
	}

	return aliases;
};
