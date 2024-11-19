export default class mapResponse {
	mapResponse(
		handler: MaybeArray<
			MapResponse<
				mergeType<
					LocalSchema,
					Schema,
					Definitions,
					Metadata,
					Ephemeral,
					Volatile
				>,
				Singleton & AfterOnMethod<Ephemeral, Volatile, Singleton>
			>
		>,
	): this;

	mapResponse<Type extends LifeCycleType>(
		options: { as?: Type },
		handler: MaybeArray<
			MapResponse<
				mergeType<
					LocalSchema,
					Schema,
					Definitions,
					Metadata,
					Ephemeral,
					Volatile
				>,
				Singleton & AfterOnMethod<Ephemeral, Volatile, Singleton>
			>
		>,
	): this;

	mapResponse(
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>,
	) {
		return this.handleOn(
			"mapResponse",
			options as { as?: LifeCycleType },
			handler as any,
		);
	}
}
