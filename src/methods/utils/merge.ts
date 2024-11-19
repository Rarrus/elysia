export const mergeDeep = <
	A extends Record<string, any>,
	B extends Record<string, any>,
>(
	target: A,
	source: B,
	{
		skipKeys,
		override = true,
	}: {
		skipKeys?: string[];
		override?: boolean;
	} = {},
): A & B => {
	if (!isObject(target) || !isObject(source)) return target as A & B;

	for (const [key, value] of Object.entries(source)) {
		if (skipKeys?.includes(key)) continue;

		if (!isObject(value) || !(key in target) || isClass(value)) {
			if (override || !(key in target))
				target[key as keyof typeof target] = value;

			continue;
		}

		target[key as keyof typeof target] = mergeDeep(
			(target as any)[key] as any,
			value,
			{ skipKeys, override },
		);
	}

	return target as A & B;
};
export const mergeCookie = <const A extends Object, const B extends Object>(
	a: A,
	b: B,
): A & B => {
	// @ts-ignore
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { properties: _, ...target } = a ?? {};

	// @ts-ignore
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { properties: __, ...source } = b ?? {};

	return mergeDeep(target, source) as A & B;
};

export const mergeObjectArray = <T extends HookContainer>(
	a: T | T[] = [],
	b: T | T[] = [],
): T[] => {
	if (!a) return [];
	if (!b) return a as any;

	// ! Must copy to remove side-effect
	const array = <T[]>[];
	const checksums = <(number | undefined)[]>[];

	if (!Array.isArray(a)) a = [a];
	if (!Array.isArray(b)) b = [b];

	for (const item of a) {
		array.push(item);

		if (item.checksum) checksums.push(item.checksum);
	}

	for (const item of b)
		if (!checksums.includes(item.checksum)) array.push(item);

	return array;
};

export const mergeResponse = (
	a: InputSchema["response"],
	b: InputSchema["response"],
) => {
	// If both are Record<number, ...> then merge them,
	// giving preference to b.
	type RecordNumber = Record<number, any>;
	const isRecordNumber = (x: typeof a | typeof b): x is RecordNumber =>
		typeof x === "object" && Object.keys(x).every(isNumericString);

	if (isRecordNumber(a) && isRecordNumber(b))
		return { ...(a as RecordNumber), ...(b as RecordNumber) };
	else if (a && !isRecordNumber(a) && isRecordNumber(b))
		return { 200: a, ...(b as RecordNumber) };

	return b ?? a;
};

export const mergeSchemaValidator = (
	a?: SchemaValidator | null,
	b?: SchemaValidator | null,
): SchemaValidator => {
	return {
		body: b?.body ?? a?.body,
		headers: b?.headers ?? a?.headers,
		params: b?.params ?? a?.params,
		query: b?.query ?? a?.query,
		cookie: b?.cookie ?? a?.cookie,
		// @ts-ignore ? This order is correct - SaltyAom
		response: mergeResponse(
			// @ts-ignore
			a?.response,
			// @ts-ignore
			b?.response,
		),
	};
};

export const mergeHook = (
	a?: LifeCycleStore,
	b?: LocalHook<any, any, any, any, any, any, any>,
	// { allowMacro = false }: { allowMacro?: boolean } = {}
): LifeCycleStore => {
	// In case if merging union is need
	// const customAStore: Record<string, unknown> = {}
	// const customBStore: Record<string, unknown> = {}

	// for (const [key, value] of Object.entries(a)) {
	// 	if (primitiveHooks.includes(key as any)) continue

	// 	customAStore[key] = value
	// }

	// for (const [key, value] of Object.entries(b)) {
	// 	if (primitiveHooks.includes(key as any)) continue

	// 	customBStore[key] = value
	// }

	// const unioned = Object.keys(customAStore).filter((x) =>
	// 	Object.keys(customBStore).includes(x)
	// )

	// // Must provide empty object to prevent reference side-effect
	// const customStore = Object.assign({}, customAStore, customBStore)

	// for (const union of unioned)
	// 	customStore[union] = mergeObjectArray(
	// 		customAStore[union],
	// 		customBStore[union]
	// 	)

	return {
		...a,
		...b,
		// Merge local hook first
		// @ts-ignore
		body: b?.body ?? a?.body,
		// @ts-ignore
		headers: b?.headers ?? a?.headers,
		// @ts-ignore
		params: b?.params ?? a?.params,
		// @ts-ignore
		query: b?.query ?? a?.query,
		// @ts-ignore
		cookie: b?.cookie ?? a?.cookie,
		// ? This order is correct - SaltyAom
		response: mergeResponse(
			// @ts-ignore
			a?.response,
			// @ts-ignore
			b?.response,
		),
		type: a?.type || b?.type,
		detail: mergeDeep(
			// @ts-ignore
			b?.detail ?? {},
			// @ts-ignore
			a?.detail ?? {},
		),
		parse: mergeObjectArray(a?.parse as any, b?.parse),
		transform: mergeObjectArray(a?.transform, b?.transform),
		beforeHandle: mergeObjectArray(a?.beforeHandle, b?.beforeHandle),
		afterHandle: mergeObjectArray(a?.afterHandle, b?.afterHandle),
		mapResponse: mergeObjectArray(a?.mapResponse, b?.mapResponse) as any,
		afterResponse: mergeObjectArray(a?.afterResponse, b?.afterResponse) as any,
		trace: mergeObjectArray(a?.trace, b?.trace) as any,
		error: mergeObjectArray(a?.error, b?.error),
	};
};

export const mergeLifeCycle = (
	a: LifeCycleStore,
	b: LifeCycleStore | LocalHook<any, any, any, any, any, any, any>,
	checksum?: number,
): LifeCycleStore => {
	return {
		// ...a,
		// ...b,
		start: mergeObjectArray(
			a.start,
			injectChecksum(checksum, b?.start),
		) as HookContainer<GracefulHandler<any>>[],
		request: mergeObjectArray(
			a.request,
			injectChecksum(checksum, b?.request),
		) as HookContainer<PreHandler<any, any>>[],
		parse: mergeObjectArray(
			a.parse,
			injectChecksum(checksum, b?.parse),
		) as HookContainer<BodyHandler<any, any>>[],
		transform: mergeObjectArray(
			a.transform,
			injectChecksum(checksum, b?.transform),
		) as HookContainer<TransformHandler<any, any>>[],
		beforeHandle: mergeObjectArray(
			a.beforeHandle,
			injectChecksum(checksum, b?.beforeHandle),
		) as HookContainer<OptionalHandler<any, any>>[],
		afterHandle: mergeObjectArray(
			a.afterHandle,
			injectChecksum(checksum, b?.afterHandle),
		) as HookContainer<AfterHandler<any, any>>[],
		mapResponse: mergeObjectArray(
			a.mapResponse,
			injectChecksum(checksum, b?.mapResponse),
		) as HookContainer<MapResponse<any, any>>[],
		afterResponse: mergeObjectArray(
			a.afterResponse,
			injectChecksum(checksum, b?.afterResponse),
		) as HookContainer<AfterResponseHandler<any, any>>[],
		// Already merged on Elysia._use, also logic is more complicated, can't directly merge
		trace: mergeObjectArray(
			a.trace,
			injectChecksum(checksum, b?.trace),
		) as HookContainer<TraceHandler<any, any>>[],
		error: mergeObjectArray(
			a.error,
			injectChecksum(checksum, b?.error),
		) as HookContainer<ErrorHandler<any, any, any>>[],
		stop: mergeObjectArray(
			a.stop,
			injectChecksum(checksum, b?.stop),
		) as HookContainer<GracefulHandler<any>>[],
	};
};
