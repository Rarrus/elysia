import type {
	ReplaceTypeElysia,
	SetupTypeElysia,
} from "../../types/generalType";
import type { DefinitionBase } from "../../types";
import { ERROR_CODE } from "../../error";
import Elysia from "class/Elysia";

type PrototypeError = ErrorInterface<DefinitionBase>["PrototypeError"];
type AllErrors = ErrorInterface<DefinitionBase>["AllErrors"];

export default class ErrorElysia<Definitions extends DefinitionBase> {
	[x: string]: any;

	/**
	 * Register errors
	 *
	 * ---
	 * @example
	 * ```typescript
	 * class CustomError extends Error {
	 *     constructor() {
	 *         super()
	 *     }
	 * }
	 *
	 * new Elysia()
	 *     .error('CUSTOM_ERROR', CustomError)
	 * ```
	 */
	error<
		const Errors extends ErrorInterface<Definitions>["RecordsPrototypeError"],
	>(
		errors: Errors,
	): ReplaceTypeElysia<
		DefinitionBase,
		SetupError<Definitions, Errors>["setup"]
	>;

	error<Name extends string, CustomError extends PrototypeError>(
		name: Name,
		errors: CustomError,
	): SetupTypeElysia<
		DefinitionBase,
		Definitions["error"] & {
			[name in Name]: CustomError extends {
				prototype: infer LiteralError extends Error<Definitions>;
			}
				? LiteralError
				: CustomError;
		}
	>;

	error<const NewErrors extends Record<string, Error<Definitions>>>(
		mapper: (decorators: Definitions["error"]) => NewErrors,
	): ReplaceTypeElysia<
		DefinitionBase,
		SetupError<Definitions, NewErrors>["setup"]
	>;

	error(
		name:
			| string
			| Record<string, ErrorInterface<Definitions>["PrototypeError"]>
			| Function,
		error?: {
			prototype: Error<Definitions>;
		},
	): Elysia {
		switch (typeof name) {
			case "string":
				if (error) error.prototype[ERROR_CODE] = name;

				this.Definitions.error[name] = error;

				return this;

			case "function":
				this.Definitions.error = name(this.Definitions.error);

				return this;
		}

		for (const [code, error] of Object.entries(name)) {
			error.prototype[ERROR_CODE] = code;

			this.Definitions.error[code] = error;
		}

		return this;
	}
}

const env =
	typeof Bun !== "undefined"
		? Bun.env
		: typeof process !== "undefined"
			? process?.env
			: undefined;

export const ERROR_CODE = Symbol("ElysiaErrorCode");
export type ERROR_CODE = typeof ERROR_CODE;

export const isProduction = (env?.NODE_ENV ?? env?.ENV) === "production";

export class InternalServerError extends Error {
	code = "INTERNAL_SERVER_ERROR";
	status = 500;

	constructor(message?: string) {
		super(message ?? "INTERNAL_SERVER_ERROR");
	}
}

export class NotFoundError extends Error {
	code = "NOT_FOUND";
	status = 404;

	constructor(message?: string) {
		super(message ?? "NOT_FOUND");
	}
}

export class ParseError extends Error {
	code = "PARSE";
	status = 400;

	constructor() {
		super("Failed to parse body");
	}
}

export class InvalidCookieSignature extends Error {
	code = "INVALID_COOKIE_SIGNATURE";
	status = 400;

	constructor(
		public key: string,
		message?: string,
	) {
		super(message ?? `"${key}" has invalid cookie signature`);
	}
}

export class ValidationError extends Error {
	code = "VALIDATION";
	status = 422;

	constructor(
		public type: string,
		public validator: TSchema | TypeCheck<any>,
		public value: unknown,
	) {
		if (
			value &&
			typeof value === "object" &&
			value instanceof ElysiaCustomStatusResponse
		)
			value = value.response;

		const error = isProduction
			? undefined
			: "Errors" in validator
				? validator.Errors(value).First()
				: Value.Errors(validator, value).First();

		const customError =
			error?.schema.error !== undefined
				? typeof error.schema.error === "function"
					? error.schema.error({
							type,
							validator,
							value,
							get errors() {
								return [...validator.Errors(value)].map(mapValueError);
							},
						})
					: error.schema.error
				: undefined;

		const accessor = error?.path || "root";
		let message = "";

		if (customError !== undefined) {
			message =
				typeof customError === "object"
					? JSON.stringify(customError)
					: customError + "";
		} else if (isProduction) {
			message = JSON.stringify({
				type: "validation",
				on: type,
				summary: mapValueError(error).summary,
				message: error?.message,
				found: value,
			});
		} else {
			// @ts-ignore private field
			const schema = validator?.schema ?? validator;
			const errors =
				"Errors" in validator
					? [...validator.Errors(value)].map(mapValueError)
					: [...Value.Errors(validator, value)].map(mapValueError);

			let expected;

			try {
				expected = Value.Create(schema);
			} catch (error) {
				expected = {
					type: "Could not create expected value",
					// @ts-expect-error
					message: error?.message,
					error,
				};
			}

			message = JSON.stringify(
				{
					type: "validation",
					on: type,
					summary: errors[0]?.summary,
					property: accessor,
					message: error?.message,
					expected,
					found: value,
					errors,
				},
				null,
				2,
			);
		}

		super(message);

		Object.setPrototypeOf(this, ValidationError.prototype);
	}

	get all() {
		return "Errors" in this.validator
			? [...this.validator.Errors(this.value)].map(mapValueError)
			: // @ts-ignore
				[...Value.Errors(this.validator, this.value)].map(mapValueError);
	}

	static simplifyModel(validator: TSchema | TypeCheck<any>) {
		// @ts-ignore
		const model = "schema" in validator ? validator.schema : validator;

		try {
			return Value.Create(model);
		} catch {
			return model;
		}
	}

	get model() {
		return ValidationError.simplifyModel(this.validator);
	}

	toResponse(headers?: Record<string, any>) {
		return new Response(this.message, {
			status: 400,
			headers: {
				...headers,
				"content-type": "application/json",
			},
		});
	}
}
