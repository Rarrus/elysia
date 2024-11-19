export default class onParse {
	onParse(
		parser: MaybeArray<
			BodyHandler<
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
	): this;

	onParse<const Type extends LifeCycleType>(
		options: { as?: Type },
		parser: MaybeArray<
			BodyHandler<
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
								Partial<Ephemeral["derive"] & Volatile["derive"]>;
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
									Ephemeral["derive"] &
									Volatile["derive"];
								resolve: {};
							}
			>
		>,
	): this;

	onParse(
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>,
	) {
		return this.handleOn(
			"parse",
			options as { as?: LifeCycleType },
			handler as any,
		);
	}
}
