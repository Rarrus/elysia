import type {
	EphemeralT,
	ExcludeElysiaResponse,
	LifeCycleType,
	MaybePromise,
	SingletonBase,
	VolatileT,
} from "../../../types";
import type { Context } from "../../../context";
import type { SetupTypeElysia } from "../../../types/generalType";
import type { deriveContext, deriveType, DerivativeType } from "../interface";

export class mapDerive<
	Derivative extends DerivativeType,
	Singleton extends SingletonBase,
	Ephemeral extends EphemeralT,
	Volatile extends VolatileT,
	Type extends LifeCycleType,
	BasePath extends string,
> {
	mapDerive(
		mapper: (
			context: Context<
				{},
				Singleton & {
					derive: Ephemeral["derive"] & Volatile["derive"];
					resolve: Ephemeral["resolve"] & Volatile["resolve"];
				},
				BasePath
			>,
		) => MaybePromise<Derivative>,
	): SetupTypeElysia<VolatileT, ExcludeElysiaResponse<Derivative>>;

	mapDerive(
		options: { as?: Type },
		mapper: (
			context: deriveContext<Singleton, Ephemeral, Volatile, Type, BasePath>,
		) => MaybePromise<Derivative>,
	): deriveType<Derivative, Singleton, Ephemeral, Volatile, Type, "resolve">;

	mapDerive(
		optionsOrDerive: { as?: Type } | Function,
		mapper?: Function,
	): AnyElysia {
		return this.handleTransform("mapDerive", optionsOrDerive, mapper);
	}
}
