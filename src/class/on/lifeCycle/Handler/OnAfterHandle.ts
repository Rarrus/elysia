import { AfterHandler, LifeCycleType, MaybeArray } from "../../../types";
import type { Elysia } from "../../Elysia";
import type { MergedType, mergeType } from "../../../types/onType";
export default class OnAfterHandle {
	[x: string]: any;
	handleOn(
		nameOfOn: string,
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>,
	): this {
		if (!handler) return this.on(nameOfOn, options as any);

		return this.on(options as { as?: LifeCycleType }, nameOfOn, handler as any);
	}

	/**
	 * ### After Handle | Life cycle event
	 * Intercept request **after** main handler is called.
	 *
	 * If truthy value is returned, will be assigned as `Response`
	 *
	 * ---
	 * @example
	 * ```typescript
	 * new Elysia()
	 *     .onAfterHandle((context, response) => {
	 *         if(typeof response === "object")
	 *             return JSON.stringify(response)
	 *     })
	 * ```
	 */
	onAfterHandle<onGeneralType>(
		handler: MaybeArray<
			AfterHandler<
				mergeType<MergedType>,
				Singleton & AfterOnMethod<Ephemeral, Volatile, Singleton>
			>
		>,
	): this;

	onAfterHandle<const Type extends LifeCycleType>(
		options: { as?: LifeCycleType },
		handler: MaybeArray<
			AfterHandler<
				mergeType<MergedType>,
				Singleton & AfterOnMethodType<Type, Ephemeral, Volatile>
			>
		>,
	): this;

	onAfterHandle(
		options: { as?: LifeCycleType } | MaybeArray<Function>,
		handler?: MaybeArray<Function>,
	) {
		return this.handleOn(
			"afterHandle",
			options as { as?: LifeCycleType },
			handler as any,
		);
	}
}
