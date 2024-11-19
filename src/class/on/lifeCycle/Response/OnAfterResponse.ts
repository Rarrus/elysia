export default class onAfterResponse {
	/**
	 * ### response | Life cycle event
	 * Call AFTER main handler is executed
	 * Good for analytic metrics
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .onAfterResponse(() => {
	 *         cleanup()
	 *     })
	 * ```
	 */

	onAfterResponse(
		handler: MaybeArray<
			AfterResponseHandler<
				mergeType<MergedType>,
				Singleton & AfterOnMethod<Ephemeral, Volatile, Singleton>
			>
		>,
	): this;

	onAfterResponse<const Type extends LifeCycleType>(
		options: { as?: Type },
		handler: MaybeArray<
			AfterResponseHandler<
				mergeType<MergedType>,
				Singleton & AfterOnMethodType<Type, Ephemeral, Volatile>
			>
		>,
	): this;

	onAfterResponse(
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>,
	) {
		return this.handleOn(
			"afterResponse",
			options as { as?: LifeCycleType },
			handler as any,
		);
	}
}
