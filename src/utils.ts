export const replaceUrlPath = (url: string, pathname: string) => {
	const urlObject = new URL(url);
	urlObject.pathname = pathname;
	return urlObject.toString();
};

export const primitiveHooks = [
	"start",
	"request",
	"parse",
	"transform",
	"resolve",
	"beforeHandle",
	"afterHandle",
	"mapResponse",
	"afterResponse",
	"trace",
	"error",
	"stop",
	"body",
	"headers",
	"params",
	"query",
	"response",
	"type",
	"detail",
] as const;

const primitiveHookMap = primitiveHooks.reduce(
	(acc, x) => ((acc[x] = true), acc),
	{} as Record<string, boolean>,
);

const isBun = typeof Bun !== "undefined";
const hasHash = isBun && typeof Bun.hash === "function";

// https://stackoverflow.com/a/52171480
export const checksum = (s: string) => {
	if (hasHash) return Bun.hash(s) as number;

	let h = 9;

	for (let i = 0; i < s.length; ) h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9);

	return (h = h ^ (h >>> 9));
};

let _stringToStructureCoercions: ReplaceSchemaTypeOptions[];

export const stringToStructureCoercions = () => {
	if (!_stringToStructureCoercions) {
		_stringToStructureCoercions = [
			{
				from: t.Object({}),
				to: () => t.ObjectString({}),
				excludeRoot: true,
			},
			{
				from: t.Array(t.Any()),
				to: () => t.ArrayString(t.Any()),
			},
		] satisfies ReplaceSchemaTypeOptions[];
	}

	return _stringToStructureCoercions;
};

let _coercePrimitiveRoot: ReplaceSchemaTypeOptions[];

export const coercePrimitiveRoot = () => {
	if (!_coercePrimitiveRoot)
		_coercePrimitiveRoot = [
			{
				from: t.Number(),
				to: (options) => t.Numeric(options),
				rootOnly: true,
			},
			{
				from: t.Boolean(),
				to: (options) => t.BooleanString(options),
				rootOnly: true,
			},
		] satisfies ReplaceSchemaTypeOptions[];

	return _coercePrimitiveRoot;
};

export const injectChecksum = (
	checksum: number | undefined,
	x: MaybeArray<HookContainer> | undefined,
) => {
	if (!x) return;

	if (!Array.isArray(x)) {
		// ? clone fn is required to prevent side-effect from changing hookType
		const fn = x;

		if (checksum && !fn.checksum) fn.checksum = checksum;
		if (fn.scope === "scoped") fn.scope = "local";

		return fn;
	}

	// ? clone fns is required to prevent side-effect from changing hookType
	const fns = [...x];

	for (const fn of fns) {
		if (checksum && !fn.checksum) fn.checksum = checksum;

		if (fn.scope === "scoped") fn.scope = "local";
	}

	return fns;
};

export const asHookType = (
	fn: HookContainer,
	inject: LifeCycleType,
	{ skipIfHasType = false }: { skipIfHasType?: boolean } = {},
) => {
	if (!fn) return fn;

	if (!Array.isArray(fn)) {
		if (skipIfHasType) fn.scope ??= inject;
		else fn.scope = inject;

		return fn;
	}

	for (const x of fn)
		if (skipIfHasType) x.scope ??= inject;
		else x.scope = inject;

	return fn;
};

const filterGlobal = (fn: MaybeArray<HookContainer>) => {
	if (!fn) return fn;

	if (!Array.isArray(fn))
		switch (fn.scope) {
			case "global":
			case "scoped":
				return { ...fn };

			default:
				return { fn };
		}

	const array = <any>[];

	for (const x of fn)
		switch (x.scope) {
			case "global":
			case "scoped":
				array.push({
					...x,
				});
				break;
		}

	return array;
};

export const filterGlobalHook = (
	hook: LocalHook<any, any, any, any, any, any, any>,
): LocalHook<any, any, any, any, any, any, any> => {
	return {
		// rest is validator
		...hook,
		type: hook?.type,
		detail: hook?.detail,
		parse: filterGlobal(hook?.parse),
		transform: filterGlobal(hook?.transform),
		beforeHandle: filterGlobal(hook?.beforeHandle),
		afterHandle: filterGlobal(hook?.afterHandle),
		mapResponse: filterGlobal(hook?.mapResponse),
		afterResponse: filterGlobal(hook?.afterResponse),
		error: filterGlobal(hook?.error),
		trace: filterGlobal(hook?.trace),
	} as LocalHook<any, any, any, any, any, any, any>;
};

export const StatusMap = {
	Continue: 100,
	"Switching Protocols": 101,
	Processing: 102,
	"Early Hints": 103,
	OK: 200,
	Created: 201,
	Accepted: 202,
	"Non-Authoritative Information": 203,
	"No Content": 204,
	"Reset Content": 205,
	"Partial Content": 206,
	"Multi-Status": 207,
	"Already Reported": 208,
	"Multiple Choices": 300,
	"Moved Permanently": 301,
	Found: 302,
	"See Other": 303,
	"Not Modified": 304,
	"Temporary Redirect": 307,
	"Permanent Redirect": 308,
	"Bad Request": 400,
	Unauthorized: 401,
	"Payment Required": 402,
	Forbidden: 403,
	"Not Found": 404,
	"Method Not Allowed": 405,
	"Not Acceptable": 406,
	"Proxy Authentication Required": 407,
	"Request Timeout": 408,
	Conflict: 409,
	Gone: 410,
	"Length Required": 411,
	"Precondition Failed": 412,
	"Payload Too Large": 413,
	"URI Too Long": 414,
	"Unsupported Media Type": 415,
	"Range Not Satisfiable": 416,
	"Expectation Failed": 417,
	"I'm a teapot": 418,
	"Misdirected Request": 421,
	"Unprocessable Content": 422,
	Locked: 423,
	"Failed Dependency": 424,
	"Too Early": 425,
	"Upgrade Required": 426,
	"Precondition Required": 428,
	"Too Many Requests": 429,
	"Request Header Fields Too Large": 431,
	"Unavailable For Legal Reasons": 451,
	"Internal Server Error": 500,
	"Not Implemented": 501,
	"Bad Gateway": 502,
	"Service Unavailable": 503,
	"Gateway Timeout": 504,
	"HTTP Version Not Supported": 505,
	"Variant Also Negotiates": 506,
	"Insufficient Storage": 507,
	"Loop Detected": 508,
	"Not Extended": 510,
	"Network Authentication Required": 511,
} as const;

export const InvertedStatusMap = Object.fromEntries(
	Object.entries(StatusMap).map(([k, v]) => [v, k]),
) as {
	[K in keyof StatusMap as StatusMap[K]]: K;
};

export type StatusMap = typeof StatusMap;
export type InvertedStatusMap = typeof InvertedStatusMap;

function removeTrailingEquals(digest: string): string {
	let trimmedDigest = digest;
	while (trimmedDigest.endsWith("=")) {
		trimmedDigest = trimmedDigest.slice(0, -1);
	}
	return trimmedDigest;
}

const encoder = new TextEncoder();

export const traceBackMacro = (
	extension: unknown,
	property: Record<string, unknown>,
) => {
	if (!extension || typeof extension !== "object" || !property) return;

	for (const [key, value] of Object.entries(property)) {
		if (key in primitiveHookMap || !(key in extension)) continue;

		const v = extension[
			key as unknown as keyof typeof extension
		] as BaseMacro[string];

		if (typeof v === "function") {
			v(value);
			delete property[key as unknown as keyof typeof extension];
		}
	}
};

export const createMacroManager =
	({
		globalHook,
		localHook,
	}: {
		globalHook: LifeCycleStore;
		localHook: LocalHook<any, any, any, any, any, any, any>;
	}) =>
	(stackName: keyof LifeCycleStore) =>
	(
		type:
			| {
					insert?: "before" | "after";
					stack?: "global" | "local";
			  }
			| MaybeArray<HookContainer>,
		fn?: MaybeArray<HookContainer>,
	) => {
		if (typeof type === "function")
			type = {
				fn: type,
			};

		if ("fn" in type || Array.isArray(type)) {
			if (!localHook[stackName]) localHook[stackName] = [];
			if (typeof localHook[stackName] === "function")
				localHook[stackName] = [localHook[stackName]];

			if (Array.isArray(type))
				localHook[stackName] = (localHook[stackName] as unknown[]).concat(
					type,
				) as any;
			else localHook[stackName].push(type);

			return;
		}

		const { insert = "after", stack = "local" } = type;

		if (typeof fn === "function") fn = { fn };

		if (stack === "global") {
			if (!Array.isArray(fn)) {
				if (insert === "before") {
					(globalHook[stackName] as any[]).unshift(fn);
				} else {
					(globalHook[stackName] as any[]).push(fn);
				}
			} else {
				if (insert === "before") {
					globalHook[stackName] = fn.concat(
						globalHook[stackName] as any,
					) as any;
				} else {
					globalHook[stackName] = (globalHook[stackName] as any[]).concat(fn);
				}
			}
		} else {
			if (!localHook[stackName]) localHook[stackName] = [];
			if (typeof localHook[stackName] === "function")
				localHook[stackName] = [localHook[stackName]];

			if (!Array.isArray(fn)) {
				if (insert === "before") {
					(localHook[stackName] as any[]).unshift(fn);
				} else {
					(localHook[stackName] as any[]).push(fn);
				}
			} else {
				if (insert === "before") {
					localHook[stackName] = fn.concat(localHook[stackName]);
				} else {
					localHook[stackName] = localHook[stackName].concat(fn);
				}
			}
		}
	};

const parseNumericString = (message: string | number): number | null => {
	if (typeof message === "number") return message;

	if (message.length < 16) {
		if (message.trim().length === 0) return null;

		const length = Number(message);
		if (Number.isNaN(length)) return null;

		return length;
	}

	// if 16 digit but less then 9,007,199,254,740,991 then can be parsed
	if (message.length === 16) {
		if (message.trim().length === 0) return null;

		const number = Number(message);
		if (Number.isNaN(number) || number.toString() !== message) return null;

		return number;
	}

	return null;
};

export class PromiseGroup implements PromiseLike<void> {
	root: Promise<any> | null = null;
	promises: Promise<any>[] = [];

	constructor(public onError: (error: any) => void = console.error) {}

	/**
	 * The number of promises still being awaited.
	 */
	get size() {
		return this.promises.length;
	}

	/**
	 * Add a promise to the group.
	 * @returns The promise that was added.
	 */
	add<T>(promise: Promise<T>) {
		this.promises.push(promise);
		this.root ||= this.drain();
		return promise;
	}

	private async drain() {
		while (this.promises.length > 0) {
			try {
				await this.promises[0];
			} catch (error) {
				this.onError(error);
			}
			this.promises.shift();
		}
		this.root = null;
	}

	// Allow the group to be awaited.
	then<TResult1 = void, TResult2 = never>(
		onfulfilled?:
			| ((value: void) => TResult1 | PromiseLike<TResult1>)
			| undefined
			| null,
		onrejected?:
			| ((reason: any) => TResult2 | PromiseLike<TResult2>)
			| undefined
			| null,
	): PromiseLike<TResult1 | TResult2> {
		return (this.root ?? Promise.resolve()).then(onfulfilled, onrejected);
	}
}

export const fnToContainer = (
	fn: MaybeArray<Function | HookContainer>,
): MaybeArray<HookContainer> => {
	if (!fn) return fn;

	if (!Array.isArray(fn)) {
		if (typeof fn === "function") return { fn };
		else if ("fn" in fn) return fn;
	}

	const fns = <HookContainer[]>[];
	for (const x of fn) {
		if (typeof x === "function") fns.push({ fn: x });
		else if ("fn" in x) fns.push(x);
	}

	return fns;
};

export const localHookToLifeCycleStore = (
	a: LocalHook<any, any, any, any, any>,
): LifeCycleStore => {
	return {
		...a,
		start: fnToContainer(a?.start),
		request: fnToContainer(a?.request),
		parse: fnToContainer(a?.parse),
		transform: fnToContainer(a?.transform),
		beforeHandle: fnToContainer(a?.beforeHandle),
		afterHandle: fnToContainer(a?.afterHandle),
		mapResponse: fnToContainer(a?.mapResponse),
		afterResponse: fnToContainer(a?.afterResponse),
		trace: fnToContainer(a?.trace),
		error: fnToContainer(a?.error),
		stop: fnToContainer(a?.stop),
	};
};

export const lifeCycleToFn = (
	a: LifeCycleStore,
): LocalHook<any, any, any, any, any, any, any> => {
	return {
		...a,
		start: a.start?.map((x) => x.fn),
		request: a.request?.map((x) => x.fn),
		parse: a.parse?.map((x) => x.fn),
		transform: a.transform?.map((x) => x.fn),
		beforeHandle: a.beforeHandle?.map((x) => x.fn),
		afterHandle: a.afterHandle?.map((x) => x.fn),
		afterResponse: a.afterResponse?.map((x) => x.fn),
		mapResponse: a.mapResponse?.map((x) => x.fn),
		trace: a.trace?.map((x) => x.fn),
		error: a.error?.map((x) => x.fn),
		stop: a.stop?.map((x) => x.fn),
	};
};

export const cloneInference = (inference: Sucrose.Inference) => ({
	body: inference.body,
	cookie: inference.cookie,
	headers: inference.headers,
	query: inference.query,
	set: inference.set,
	server: inference.server,
});

/**
 *
 * @param url URL to redirect to
 * @param HTTP status code to send,
 */
export const redirect = (
	url: string,
	status: 301 | 302 | 303 | 307 | 308 = 302,
) => Response.redirect(url, status);

export type redirect = typeof redirect;

export const ELYSIA_FORM_DATA = Symbol("ElysiaFormData");
export type ELYSIA_FORM_DATA = typeof ELYSIA_FORM_DATA;

type ElysiaFormData<T extends Record<string | number, unknown>> = FormData & {
	[ELYSIA_FORM_DATA]: Replace<T, BunFile, File>;
};

export const ELYSIA_REQUEST_ID = Symbol("ElysiaRequestId");
export type ELYSIA_REQUEST_ID = typeof ELYSIA_REQUEST_ID;

export const form = <const T extends Record<string | number, unknown>>(
	items: T,
): ElysiaFormData<T> => {
	const formData = new FormData();

	for (const [key, value] of Object.entries(items)) {
		if (Array.isArray(value)) {
			for (const v of value) {
				if (value instanceof File) formData.append(key, value, value.name);

				formData.append(key, v);
			}

			continue;
		}

		if (value instanceof File) formData.append(key, value, value.name);
		formData.append(key, value);
	}

	return formData as any;
};

export const randomId = () => crypto.getRandomValues(new Uint32Array(1))[0];

// ! Deduplicate current instance
export const deduplicateChecksum = <T extends Function>(
	array: HookContainer<T>[],
): HookContainer<T>[] => {
	const hashes: number[] = [];

	for (let i = 0; i < array.length; i++) {
		const item = array[i];

		if (item.checksum) {
			if (hashes.includes(item.checksum)) {
				array.splice(i, 1);
				i--;
			}

			hashes.push(item.checksum);
		}
	}

	return array;
};

/**
 * Since it's a plugin, which means that ephemeral is demoted to volatile.
 * Which  means there's no volatile and all previous ephemeral become volatile
 * We can just promote back without worry
 */
export const promoteEvent = (
	events: (HookContainer | Function)[],
	as: "scoped" | "global" = "scoped",
): void => {
	if (as === "scoped") {
		for (const event of events)
			if ("scope" in event && event.scope === "local") event.scope = "scoped";

		return;
	}

	for (const event of events) if ("scope" in event) event.scope = "global";
};

type PropertyKeys<T> = {
	[K in keyof T]: T[K] extends (...args: any[]) => any ? never : K;
}[keyof T];

type PropertiesOnly<T> = Pick<T, PropertyKeys<T>>;

// export const classToObject = <T>(
// 	instance: T,
// 	processed: WeakMap<object, object> = new WeakMap()
// ): T extends object ? PropertiesOnly<T> : T => {
// 	if (typeof instance !== 'object' || instance === null)
// 		return instance as any

// 	if (Array.isArray(instance))
// 		return instance.map((x) => classToObject(x, processed)) as any

// 	if (processed.has(instance)) return processed.get(instance) as any

// 	const result: Partial<T> = {}

// 	for (const key of Object.keys(instance) as Array<keyof T>) {
// 		const value = instance[key]
// 		if (typeof value === 'object' && value !== null)
// 			result[key] = classToObject(value, processed) as T[keyof T]
// 		else result[key] = value
// 	}

// 	const prototype = Object.getPrototypeOf(instance)
// 	if (!prototype) return result as any

// 	const properties = Object.getOwnPropertyNames(prototype)

// 	for (const property of properties) {
// 		const descriptor = Object.getOwnPropertyDescriptor(
// 			Object.getPrototypeOf(instance),
// 			property
// 		)

// 		if (descriptor && typeof descriptor.get === 'function') {
// 			// ? Very important to prevent prototype pollution
// 			if (property === '__proto__') continue

// 			;(result as any)[property as keyof typeof instance] = classToObject(
// 				instance[property as keyof typeof instance]
// 			)
// 		}
// 	}

// 	return result as any
// }
