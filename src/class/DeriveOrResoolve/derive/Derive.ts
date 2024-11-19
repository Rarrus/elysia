import type {
	EphemeralT,
	ExcludeElysiaResponse,
	LifeCycleType,
	MaybePromise,
	Prettify,
	SingletonBase,
	VolatileT,
} from "../../../types";
import type { Context } from "@/context";
import type { SetupTypeElysia } from "../../../types/generalType";
import type { DerivativeType } from "../interface";

export class Derive<
	Derivative extends DerivativeType,
	Singleton extends SingletonBase,
	Ephemeral extends EphemeralT,
	Volatile extends VolatileT,
	Type extends LifeCycleType,
	BasePath extends string,
> {
	[x: string]: any;

	/**
	 * Derive new property for each request with access to `Context`.
	 *
	 * If error is thrown, the scope will skip to handling error instead.
	 *
	 * ---
	 * @example
	 * new Elysia()
	 *     .state('counter', 1)
	 *     .derive(({ store }) => ({
	 *         increase() {
	 *             store.counter++
	 *         }
	 *     }))
	 */
	derive(
		transform: (
			context: Prettify<
				Context<
					{},
					Singleton & {
						derive: Ephemeral["derive"] & Volatile["derive"];
						resolve: Ephemeral["resolve"] & Volatile["resolve"];
					}
				>
			>,
		) => MaybePromise<Derivative>,
	): SetupTypeElysia<
		VolatileT,
		Prettify<Volatile["derive"] & ExcludeElysiaResponse<Derivative>>
	>;

	derive(
		options: { as?: Type },
		transform: (
			context: Prettify<
				deriveContext<Singleton, Ephemeral, Volatile, Type, BasePath>
			>,
		) => MaybePromise<Derivative>,
	): deriveType<Derivative, Singleton, Ephemeral, Volatile, Type, "derive">;

	derive(
		optionsOrTransform: { as?: LifeCycleType } | Function,
		transform?: Function,
	): AnyElysia {
		return this.handleTransform("derive", optionsOrTransform, transform);
	}
}
