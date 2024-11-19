export default class onTransform {
	static onTransform(
		handler: MaybeArray<
			TransformHandler<
				mergeType<
					LocalSchema,
					Schema,
					Definitions,
					Metadata,
					Ephemeral,
					Volatile
				>,
				{
					decorator: Singleton["decorator"];
					store: Singleton["store"];
					derive: Singleton["derive"] &
						Ephemeral["derive"] &
						Volatile["derive"];
					resolve: {};
				}
			>
		>,
	): Elysia;

	static onTransform<const Type extends LifeCycleType>(
		options: { as?: Type },
		handler: MaybeArray<
			TransformHandler<
				mergeType<
					LocalSchema,
					Schema,
					Definitions,
					Metadata,
					Ephemeral,
					Volatile
				>,
				"global" extends Type
					? {
							decorator: Singleton["decorator"];
							store: Singleton["store"];
							derive: Singleton["derive"] &
								Ephemeral["derive"] &
								Volatile["derive"];
							resolve: {};
						}
					: "scoped" extends Type
						? {
								decorator: Singleton["decorator"];
								store: Singleton["store"];
								derive: Singleton["derive"] &
									Ephemeral["derive"] &
									Partial<Volatile["derive"]>;
								resolve: {};
							}
						: {
								decorator: Singleton["decorator"];
								store: Singleton["store"];
								derive: Singleton["derive"] &
									Partial<Ephemeral["derive"] & Volatile["derive"]>;
								resolve: {};
							}
			>
		>,
	): Elysia;

	onTransform(
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>,
	): this {
		return this.handleOn(
			"transform",
			options as { as?: LifeCycleType },
			handler as any,
		);
	}
}
