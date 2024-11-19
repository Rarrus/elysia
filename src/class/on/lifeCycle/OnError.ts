export default class onError {
	/**
	 * ### Error | Life cycle event
	 * Called when error is thrown during processing request
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .onError(({ code }) => {
	 *         if(code === "NOT_FOUND")
	 *             return "Path not found :("
	 *     })
	 * ```
	 */
	onError(
		handler: MaybeArray<
			ErrorHandler<
				Definitions["error"],
				mergeType<
					LocalSchema,
					Schema,
					Definitions,
					Metadata,
					Ephemeral,
					Volatile
				>,
				Singleton,
				Ephemeral,
				Volatile
			>
		>,
	): this;

	onError<const Scope extends LifeCycleType>(
		options: { as?: Scope },
		handler: MaybeArray<
			ErrorHandler<
				Definitions["error"],
				mergeType<
					LocalSchema,
					Schema,
					Definitions,
					Metadata,
					Ephemeral,
					Volatile
				>,
				Scope extends "global"
					? {
							store: Singleton["store"];
							decorator: Singleton["decorator"];
							derive: Singleton["derive"] &
								Ephemeral["derive"] &
								Volatile["derive"];
							resolve: Singleton["resolve"] &
								Ephemeral["resolve"] &
								Volatile["resolve"];
						}
					: Scope extends "scoped"
						? {
								store: Singleton["store"];
								decorator: Singleton["decorator"];
								derive: Singleton["derive"] & Ephemeral["derive"];
								resolve: Singleton["resolve"] & Ephemeral["resolve"];
							}
						: Singleton,
				Scope extends "global"
					? Ephemeral
					: {
							derive: Partial<Ephemeral["derive"]>;
							resolve: Partial<Ephemeral["resolve"]>;
							schema: Ephemeral["schema"];
						},
				Scope extends "global"
					? Ephemeral
					: Scope extends "scoped"
						? Ephemeral
						: {
								derive: Partial<Ephemeral["derive"]>;
								resolve: Partial<Ephemeral["resolve"]>;
								schema: Ephemeral["schema"];
							}
			>
		>,
	): this;

	onError(
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>,
	) {
		return this.handleOn(
			"error",
			options as { as?: LifeCycleType },
			handler as any,
		);
	}
}
