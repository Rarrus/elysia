import type { SetupTypeElysia } from "types/generalType";
import type { ElysiaCustomStatusResponse } from "../../error";
import type {
	EphemeralT,
	ExcludeElysiaResponse,
	LifeCycleType,
	Prettify,
	SingletonBase,
	VolatileT,
} from "../../types";
import type { Context } from "../../types";

export type DerivativeType =
	| Record<string, unknown>
	| ElysiaCustomStatusResponse<any, any, any>;

export type deriveContext<
	Singleton extends SingletonBase,
	Ephemeral extends EphemeralT,
	Volatile extends VolatileT,
	Type extends LifeCycleType,
	BasePath extends string,
> = Context<
	{},
	Singleton &
		("global" extends Type
			? {
					derive: Partial<Ephemeral["derive"] & Volatile["derive"]>;
					resolve: Partial<Ephemeral["resolve"] & Volatile["resolve"]>;
				}
			: "scoped" extends Type
				? {
						derive: Ephemeral["derive"] & Partial<Volatile["derive"]>;
						resolve: Ephemeral["resolve"] & Partial<Volatile["resolve"]>;
					}
				: {
						derive: Ephemeral["derive"] & Volatile["derive"];
						resolve: Ephemeral["resolve"] & Volatile["resolve"];
					}),
	BasePath
>;

export type deriveType<
	Derivative extends DerivativeType,
	Singleton extends SingletonBase,
	Ephemeral extends EphemeralT,
	Volatile extends VolatileT,
	Type extends LifeCycleType,
	resolveOrDerive extends "resolve" | "derive",
> = Type extends "global"
	? SetupTypeElysia<
			SingletonBase,
			Prettify<Singleton[resolveOrDerive] & ExcludeElysiaResponse<Derivative>>
		>
	: Type extends "scoped"
		? SetupTypeElysia<
				EphemeralT,
				Prettify<Ephemeral[resolveOrDerive] & ExcludeElysiaResponse<Derivative>>
			>
		: SetupTypeElysia<
				VolatileT,
				Prettify<Volatile[resolveOrDerive] & ExcludeElysiaResponse<Derivative>>
			>;
