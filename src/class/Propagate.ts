/**
 * @deprecated use `Elysia.as` instead
 *
 * Will be removed in Elysia 1.2
 */
import type { Elysia } from "../Elysia";
import {
	DefinitionBase,
	EphemeralType,
	MetadataBase,
	Prettify2,
	RouteBase,
	SingletonBase,
} from "../../types";
import { promoteEvent } from "../utils";

export default class Propagate {
	[x: string]: any;

	propagate<
		const BasePath extends string,
		const Scoped extends boolean,
	>(): Elysia<
		BasePath,
		Scoped,
		SingletonBase,
		DefinitionBase,
		MetadataBase,
		RouteBase,
		Prettify2<EphemeralType>,
		{
			derive: {};
			resolve: {};
			schema: {};
		}
	> {
		promoteEvent(this.event.parse);
		promoteEvent(this.event.transform);
		promoteEvent(this.event.beforeHandle);
		promoteEvent(this.event.afterHandle);
		promoteEvent(this.event.mapResponse);
		promoteEvent(this.event.afterResponse);
		promoteEvent(this.event.trace);
		promoteEvent(this.event.error);

		return this as any;
	}
}
