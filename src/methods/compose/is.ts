const matchFnReturn = /(?:return|=>) \S+\(/g;

export const isAsyncName = (v: Function | HookContainer) => {
	const fn = v?.fn ?? v;

	return fn.constructor.name === "AsyncFunction";
};

export const isAsync = (v: Function | HookContainer) => {
	const fn = v?.fn ?? v;

	if (fn.constructor.name === "AsyncFunction") return true;

	const literal = fn.toString();
	if (literal.includes("=> response.clone(")) return false;
	if (literal.includes("await")) return true;
	if (literal.includes("async")) return true;

	return !!literal.match(matchFnReturn);
};

export const isGenerator = (v: Function | HookContainer) => {
	const fn = v?.fn ?? v;

	return (
		fn.constructor.name === "AsyncGeneratorFunction" ||
		fn.constructor.name === "GeneratorFunction"
	);
};

const isOptional = (validator?: TypeCheck<any>) => {
	if (!validator) return false;

	const schema = validator?.schema;

	return !!schema && TypeBoxSymbol.optional in schema;
};

export const isContextPassToFunction = (
	context: string,
	body: string,
	inference: Sucrose.Inference,
) => {
	// ! Function is passed to another function, assume as all is accessed
	try {
		const captureFunction = new RegExp(`(?:\\w)\\((?:.*)?${context}`, "gs");
		captureFunction.test(body);

		/*
		Since JavaScript engine already format the code (removing whitespace, newline, etc.),
		we can safely assume that the next character is either a closing bracket or a comma
		if the function is passed to another function
		*/
		const nextChar = body.charCodeAt(captureFunction.lastIndex);

		if (nextChar === 41 || nextChar === 44) {
			inference.query = true;
			inference.headers = true;
			inference.body = true;
			inference.cookie = true;
			inference.set = true;
			inference.server = true;

			return true;
		}

		return false;
	} catch (error) {
		console.log(
			"[Sucrose] warning: unexpected isContextPassToFunction error, you may continue development as usual but please report the following to maintainers:",
		);
		console.log("--- body ---");
		console.log(body);
		console.log("--- context ---");
		console.log(context);

		return true;
	}
};

export const isNotEmpty = (obj?: Object) => {
	if (!obj) return false;

	for (const x in obj) return true;

	return false;
};

export const isClass = (v: Object) =>
	(typeof v === "function" && /^\s*class\s+/.test(v.toString())) ||
	// Handle import * as Sentry from '@sentry/bun'
	// This also handle [object Date], [object Array]
	// and FFI value like [object Prisma]
	(v.toString().startsWith("[object ") && v.toString() !== "[object Object]") ||
	// If object prototype is not pure, then probably a class-like object
	isNotEmpty(Object.getPrototypeOf(v));

const isObject = (item: any): item is Object =>
	item && typeof item === "object" && !Array.isArray(item);

export const isNumericString = (message: string | number): boolean =>
	parseNumericString(message) !== null;
