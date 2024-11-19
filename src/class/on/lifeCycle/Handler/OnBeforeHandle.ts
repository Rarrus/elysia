export default class OnBeforeHandle {

  /**
     * ### Before Handle | Life cycle event
     * Execute after validation and before the main route handler.
     *
     * If truthy value is returned, will be assigned as `Response` and skip the main handler
     *
     * ---
     * @example
     * ```typescript
     * new Elysia()
     *     .onBeforeHandle(({ params: { id }, status }) => {
     *         if(id && !isExisted(id)) {
     * 	           status(401)
     *
     *             return "Unauthorized"
     * 	       }
     *     })
     * ```
     */
  onBeforeHandle(
    handler: MaybeArray<
      OptionalHandler<
        mergeType<MergedType>,
        Singleton & AfterOnMethod<Ephemeral, Volatile, Singleton>
      >
    >
  ): this

  onBeforeHandle<const Type extends LifeCycleType>(
    options: { as?: Type },
    handler:
	): this

  onBeforeHandle(
    options: { as?: LifeCycleType } | MaybeArray<Function>,
    handler?: MaybeArray<Function>
  ) {
    return this.handleOn(
      'beforeHandle',
      options as { as?: LifeCycleType },
      handler as any
    )
  }
}
