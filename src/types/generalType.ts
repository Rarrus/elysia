import type { Elysia } from "../class/Elysia";
import type {
	AddPrefix,
	AddPrefixCapitalize,
	AddSuffixCapitalize,
	DefinitionBase,
	MetadataBase,
	RouteBase,
	SingletonBase,
} from "../types";

// In type Elysia, replace a type from elysia to a new preset
export type ReplaceTypeElysia<Old extends Partial<Elysia>, New extends Old> = {
	[K in keyof Elysia]: Elysia[K] extends Old ? New : Elysia[K];
};

//Create a new type elysia with a part of type from elysia are new preset
export type SetupTypeElysia<
	Type extends Partial<Elysia>,
	New extends Partial<Type>,
> = {
	[K in keyof Elysia]: Elysia[K] extends Type
		? {
				[K2 in keyof Elysia[K]]: Elysia[K][K2] extends New
					? New
					: Elysia[K][K2];
			}
		: Elysia[K];
};

type AffixDefinitionType<
	Base extends "prefix" | "suffix",
	Type extends "all" | "decorator" | "state" | "model" | "error",
	Word extends string,
	X extends "type" | "error",
	W extends DefinitionBase,
	Z extends "model" | "error",
> = Type extends Z | "all"
	? "prefix" extends Base
		? Word extends `${string}${"_" | "-" | " "}`
			? AddPrefix<Word, W[X]>
			: AddPrefixCapitalize<Word, W[X]>
		: AddSuffixCapitalize<Word, W[X]>
	: W[X];

export type ElysiaErrors =
	| InternalServerError
	| NotFoundError
	| ParseError
	| ValidationError
	| InvalidCookieSignature;
