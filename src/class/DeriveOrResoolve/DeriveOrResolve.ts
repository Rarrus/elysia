export function handleTransform(
	subType: string,
	optionsOrFunction:
		| {
				as?: LifeCycleType;
		  }
		| Function,
	transformOrMapper?: Function,
): Elysia {
	if (!transformOrMapper && typeof optionsOrFunction === "function") {
		transformOrMapper = optionsOrFunction;
		optionsOrFunction = { as: "local" };
	}

	return this.onTransform(optionsOrFunction, {
		subType: subType,
		fn: transformOrMapper!,
	});
}
