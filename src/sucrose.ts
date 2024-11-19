/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-constant-condition */
import type { Handler, HookContainer, LifeCycleStore } from "./types";

/**
 * Separate stringified function body and paramter
 *
 * @example
 * ```typescript
 * separateFunction('async ({ hello }) => { return hello }') // => ['({ hello })', '{ return hello }']
 * ```
 */
export const separateFunction = (
	code: string,
): [string, string, { isArrowReturn: boolean }] => {
	// Remove async keyword without removing space (both minify and non-minify)
	if (code.startsWith("async")) code = code.slice(5);
	code = code.trimStart();

	let index = -1;

	// Starts with '(', is an arrow function
	if (code.charCodeAt(0) === 40) {
		index = code.indexOf("=>", code.indexOf(")"));

		if (index !== -1) {
			let bracketEndIndex = index;
			// Walk back to find bracket end
			while (bracketEndIndex > 0)
				if (code.charCodeAt(--bracketEndIndex) === 41) break;

			let body = code.slice(index + 2);
			if (body.charCodeAt(0) === 32) body = body.trimStart();

			return [
				code.slice(1, bracketEndIndex),
				body,
				{
					isArrowReturn: body.charCodeAt(0) !== 123,
				},
			];
		}
	}

	// Using function keyword
	if (code.startsWith("function")) {
		index = code.indexOf("(");
		const end = code.indexOf(")");

		return [
			code.slice(index + 1, end),
			code.slice(end + 2),
			{
				isArrowReturn: false,
			},
		];
	}

	// Probably Declare as method
	const start = code.indexOf("(");

	if (start !== -1) {
		const sep = code.indexOf("\n", 2);
		const parameter = code.slice(0, sep);
		const end = parameter.lastIndexOf(")") + 1;

		const body = code.slice(sep + 1);

		return [
			parameter.slice(start, end),
			"{" + body,
			{
				isArrowReturn: false,
			},
		];
	}

	// Unknown case
	const x = code.split("\n", 2);

	return [x[0], x[1], { isArrowReturn: false }];
};

/**
 * Get range between bracket pair
 *
 * @example
 * ```typescript
 * bracketPairRange('hello: { world: { a } }, elysia') // [6, 20]
 * ```
 */
export const bracketPairRange = (parameter: string): [number, number] => {
	const start = parameter.indexOf("{");
	if (start === -1) return [-1, 0];

	let end = start + 1;
	let deep = 1;

	for (; end < parameter.length; end++) {
		const char = parameter.charCodeAt(end);

		// Open bracket
		if (char === 123) deep++;
		// Close bracket
		else if (char === 125) deep--;

		if (deep === 0) break;
	}

	if (deep !== 0) return [0, parameter.length];

	return [start, end + 1];
};

/**
 * Similar to `bracketPairRange` but in reverse order
 * Get range between bracket pair from end to beginning
 *
 * @example
 * ```typescript
 * bracketPairRange('hello: { world: { a } }, elysia') // [6, 20]
 * ```
 */
export const bracketPairRangeReverse = (
	parameter: string,
): [number, number] => {
	const end = parameter.lastIndexOf("}");
	if (end === -1) return [-1, 0];

	let start = end - 1;
	let deep = 1;

	for (; start >= 0; start--) {
		const char = parameter.charCodeAt(start);

		// Open bracket
		if (char === 125) deep++;
		// Close bracket
		else if (char === 123) deep--;

		if (deep === 0) break;
	}

	if (deep !== 0) return [-1, 0];

	return [start, end + 1];
};

/**
 * Retrieve only root paramters of a function
 *
 * @example
 * ```typescript
 * retrieveRootParameters('({ hello: { world: { a } }, elysia })') // => {
 *   parameters: ['hello', 'elysia'],
 *   hasParenthesis: true
 * }
 * ```
 */
export const retrieveRootParamters = (parameter: string) => {
	let hasParenthesis = false;

	// Remove () from parameter
	if (parameter.charCodeAt(0) === 40) parameter = parameter.slice(1, -1);

	// Remove {} from parameter
	if (parameter.charCodeAt(0) === 123) {
		hasParenthesis = true;
		parameter = parameter.slice(1, -1);
	}

	parameter = parameter.replace(/( |\t|\n)/g, "").trim();
	let parameters = <string[]>[];

	// Object destructuring
	while (true) {
		// eslint-disable-next-line prefer-const
		let [start, end] = bracketPairRange(parameter);
		if (start === -1) break;

		// Remove colon from object structuring cast
		parameters.push(parameter.slice(0, start - 1));
		if (parameter.charCodeAt(end) === 44) end++;
		parameter = parameter.slice(end);
	}

	parameter = removeColonAlias(parameter);
	if (parameter) parameters = parameters.concat(parameter.split(","));

	const newParameters = [];
	for (const p of parameters) {
		if (p.indexOf(",") === -1) {
			newParameters.push(p);
			continue;
		}

		for (const q of p.split(",")) newParameters.push(q.trim());
	}
	parameters = newParameters;

	return {
		hasParenthesis,
		parameters,
	};
};

// ? This is normalized to dot notation in Bun
// const accessor = <T extends string, P extends string>(parent: T, prop: P) =>
// 	[
// 		parent + '.' + prop,
// 		parent + '["' + prop + '"]',
// 		parent + "['" + prop + "']"
// 	] as const

export const extractMainParameter = (parameter: string) => {
	if (!parameter) return;

	if (parameter.charCodeAt(0) !== 123) return parameter;

	parameter = parameter.slice(2, -2);

	const hasComma = parameter.includes(",");
	if (!hasComma) {
		// This happens when spread operator is used as the only parameter
		if (parameter.includes("..."))
			return parameter.slice(parameter.indexOf("...") + 3);

		return;
	}

	const spreadIndex = parameter.indexOf("...");
	if (spreadIndex === -1) return;

	// Spread parameter is always the last parameter, no need for further checking
	return parameter.slice(spreadIndex + 3).trimEnd();
};

/**
 * Analyze if context is mentioned in body
 */
export const inferBodyReference = (
	code: string,
	aliases: string[],
	inference: Sucrose.Inference,
) => {
	const access = (type: string, alias: string) =>
		code.includes(alias + "." + type) ||
		code.includes(alias + '["' + type + '"]') ||
		code.includes(alias + "['" + type + "']");

	for (const alias of aliases) {
		if (!alias) continue;

		// Scan object destructured property
		if (alias.charCodeAt(0) === 123) {
			const parameters = retrieveRootParamters(alias).parameters;

			if (!inference.query && parameters.includes("query"))
				inference.query = true;

			if (!inference.headers && parameters.includes("headers"))
				inference.headers = true;

			if (!inference.body && parameters.includes("body")) inference.body = true;

			if (!inference.cookie && parameters.includes("cookie"))
				inference.cookie = true;

			if (!inference.set && parameters.includes("set")) inference.set = true;

			if (!inference.query && parameters.includes("server"))
				inference.server = true;

			continue;
		}

		if (!inference.query && access("query", alias)) inference.query = true;

		if (
			code.includes("return " + alias) ||
			code.includes("return " + alias + ".query")
		)
			inference.query = true;

		if (!inference.headers && access("headers", alias))
			inference.headers = true;

		if (!inference.body && access("body", alias)) inference.body = true;

		if (!inference.cookie && access("cookie", alias)) inference.cookie = true;

		if (!inference.set && access("set", alias)) inference.set = true;
		if (!inference.server && access("server", alias)) inference.server = true;

		if (
			inference.query &&
			inference.headers &&
			inference.body &&
			inference.cookie &&
			inference.set &&
			inference.server
		)
			break;
	}

	return aliases;
};

export const sucrose = (
	lifeCycle: Sucrose.LifeCycle,
	inference: Sucrose.Inference = {
		query: false,
		headers: false,
		body: false,
		cookie: false,
		set: false,
		server: false,
	},
): Sucrose.Inference => {
	const events = [];

	if (lifeCycle.handler && typeof lifeCycle.handler === "function")
		events.push(lifeCycle.handler);

	if (lifeCycle.request?.length) events.push(...lifeCycle.request);
	if (lifeCycle.beforeHandle?.length) events.push(...lifeCycle.beforeHandle);
	if (lifeCycle.parse?.length) events.push(...lifeCycle.parse);
	if (lifeCycle.error?.length) events.push(...lifeCycle.error);
	if (lifeCycle.transform?.length) events.push(...lifeCycle.transform);
	if (lifeCycle.afterHandle?.length) events.push(...lifeCycle.afterHandle);
	if (lifeCycle.mapResponse?.length) events.push(...lifeCycle.mapResponse);
	if (lifeCycle.afterResponse?.length) events.push(...lifeCycle.afterResponse);

	for (const e of events) {
		if (!e) continue;

		const event = "fn" in e ? e.fn : e;

		const [parameter, body, { isArrowReturn }] = separateFunction(
			event.toString(),
		);

		const rootParameters = findParameterReference(parameter, inference);
		const mainParameter = extractMainParameter(rootParameters);

		if (mainParameter) {
			const aliases = findAlias(mainParameter, body);
			aliases.splice(0, -1, mainParameter);

			if (!isContextPassToFunction(mainParameter, body, inference))
				inferBodyReference(body, aliases, inference);

			if (
				!inference.query &&
				body.includes("return " + mainParameter + ".query")
			)
				inference.query = true;
		}

		if (
			inference.query &&
			inference.headers &&
			inference.body &&
			inference.cookie &&
			inference.set &&
			inference.server
		)
			break;
	}

	return inference;
};
