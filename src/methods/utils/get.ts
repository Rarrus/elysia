export const getSchemaValidator = <T extends TSchema | string | undefined>(
	s: T,
	{
		models = {},
		dynamic = false,
		normalize = false,
		additionalProperties = false,
		coerce = false,
		additionalCoerce = [],
	}: {
		models?: Record<string, TSchema>;
		additionalProperties?: boolean;
		dynamic?: boolean;
		normalize?: boolean;
		coerce?: boolean;
		additionalCoerce?: MaybeArray<ReplaceSchemaTypeOptions>;
	} = {},
): T extends TSchema ? TypeCheck<TSchema> : undefined => {
	if (!s) return undefined as any;
	if (typeof s === "string" && !(s in models)) return undefined as any;

	let schema: TSchema = typeof s === "string" ? models[s] : s;

	if (coerce || additionalCoerce) {
		if (coerce)
			schema = replaceSchemaType(schema, [
				{
					from: t.Number(),
					to: (options) => t.Numeric(options),
					untilObjectFound: true,
				},
				{
					from: t.Boolean(),
					to: (options) => t.BooleanString(options),
					untilObjectFound: true,
				},
				...(Array.isArray(additionalCoerce)
					? additionalCoerce
					: [additionalCoerce]),
			]);
		else {
			schema = replaceSchemaType(schema, [
				...(Array.isArray(additionalCoerce)
					? additionalCoerce
					: [additionalCoerce]),
			]);
		}
	}

	// console.dir(schema, {
	// 	depth: null
	// })

	// @ts-ignore
	if (schema.type === "object" && "additionalProperties" in schema === false)
		schema.additionalProperties = additionalProperties;

	const cleaner = (value: unknown) => Value.Clean(schema, value);

	if (dynamic) {
		const validator = {
			schema,
			references: "",
			checkFunc: () => {},
			code: "",
			Check: (value: unknown) => Value.Check(schema, value),
			Errors: (value: unknown) => Value.Errors(schema, value),
			Code: () => "",
			Clean: cleaner,
			Decode: (value: unknown) => Value.Decode(schema, value),
			Encode: (value: unknown) => Value.Encode(schema, value),
		} as unknown as TypeCheck<TSchema>;

		if (normalize && schema.additionalProperties === false)
			// @ts-ignore
			validator.Clean = cleaner;

		// @ts-ignore
		if (schema.config) {
			// @ts-ignore
			validator.config = schema.config;

			// @ts-ignore
			if (validator?.schema?.config)
				// @ts-ignore
				delete validator.schema.config;
		}

		// @ts-ignore
		validator.parse = (v) => {
			try {
				return validator.Decode(v);
			} catch (error) {
				throw [...validator.Errors(v)].map(mapValueError);
			}
		};

		// @ts-ignore
		validator.safeParse = (v) => {
			try {
				return { success: true, data: validator.Decode(v), error: null };
			} catch (error) {
				const errors = [...compiled.Errors(v)].map(mapValueError);

				return {
					success: false,
					data: null,
					error: errors[0]?.summary,
					errors,
				};
			}
		};

		return validator as any;
	}

	const compiled = TypeCompiler.Compile(schema, Object.values(models));

	// @ts-expect-error
	compiled.Clean = cleaner;

	// @ts-ignore
	if (schema.config) {
		// @ts-ignore
		compiled.config = schema.config;

		// @ts-ignore
		if (compiled?.schema?.config)
			// @ts-ignore
			delete compiled.schema.config;
	}

	// @ts-ignore
	compiled.parse = (v) => {
		try {
			return compiled.Decode(v);
		} catch (error) {
			throw [...compiled.Errors(v)].map(mapValueError);
		}
	};

	// @ts-ignore
	compiled.safeParse = (v) => {
		try {
			return { success: true, data: compiled.Decode(v), error: null };
		} catch (error) {
			const errors = [...compiled.Errors(v)].map(mapValueError);

			return {
				success: false,
				data: null,
				error: errors[0]?.summary,
				errors,
			};
		}
	};

	return compiled as any;
};

export const getResponseSchemaValidator = (
	s: InputSchema["response"] | undefined,
	{
		models = {},
		dynamic = false,
		normalize = false,
		additionalProperties = false,
	}: {
		models?: Record<string, TSchema>;
		additionalProperties?: boolean;
		dynamic?: boolean;
		normalize?: boolean;
	},
): Record<number, TypeCheck<any>> | undefined => {
	if (!s) return;
	if (typeof s === "string" && !(s in models)) return;

	const maybeSchemaOrRecord = typeof s === "string" ? models[s] : s;

	const compile = (schema: TSchema, references?: TSchema[]) => {
		const cleaner = (value: unknown) => {
			if (!value || typeof value !== "object")
				return Value.Clean(schema, value);

			if (Array.isArray(value)) value = Value.Clean(schema, value);
			else value = Value.Clean(schema, value);

			return value;
		};

		if (dynamic)
			return {
				schema,
				references: "",
				checkFunc: () => {},
				code: "",
				Check: (value: unknown) => Value.Check(schema, value),
				Errors: (value: unknown) => Value.Errors(schema, value),
				Code: () => "",
				Decode: (value: unknown) => Value.Decode(schema, value),
				Encode: (value: unknown) => Value.Encode(schema, value),
			} as unknown as TypeCheck<TSchema>;

		const compiledValidator = TypeCompiler.Compile(schema, references);

		if (normalize && schema.additionalProperties === false)
			// @ts-ignore
			compiledValidator.Clean = cleaner;

		return compiledValidator;
	};

	if (Kind in maybeSchemaOrRecord) {
		if ("additionalProperties" in maybeSchemaOrRecord === false)
			maybeSchemaOrRecord.additionalProperties = additionalProperties;

		return {
			200: compile(maybeSchemaOrRecord, Object.values(models)),
		};
	}

	const record: Record<number, TypeCheck<any>> = {};

	Object.keys(maybeSchemaOrRecord).forEach((status): TSchema | undefined => {
		const maybeNameOrSchema = maybeSchemaOrRecord[+status];

		if (typeof maybeNameOrSchema === "string") {
			if (maybeNameOrSchema in models) {
				const schema = models[maybeNameOrSchema];
				schema.type === "object" && "additionalProperties" in schema === false;

				// Inherits model maybe already compiled
				record[+status] =
					Kind in schema ? compile(schema, Object.values(models)) : schema;
			}

			return undefined;
		}

		if (
			maybeNameOrSchema.type === "object" &&
			"additionalProperties" in maybeNameOrSchema === false
		)
			maybeNameOrSchema.additionalProperties = additionalProperties;

		// Inherits model maybe already compiled
		record[+status] =
			Kind in maybeNameOrSchema
				? compile(maybeNameOrSchema, Object.values(models))
				: maybeNameOrSchema;
	});

	return record;
};

export const getCookieValidator = ({
	validator,
	defaultConfig = {},
	config,
	dynamic,
	models,
}: {
	validator: TSchema | string | undefined;
	defaultConfig: CookieOptions | undefined;
	config: CookieOptions;
	dynamic: boolean;
	models: Record<string, TSchema> | undefined;
}) => {
	let cookieValidator = getSchemaValidator(validator, {
		dynamic,
		models,
		additionalProperties: true,
		coerce: true,
		additionalCoerce: stringToStructureCoercions(),
	});

	if (isNotEmpty(defaultConfig)) {
		if (cookieValidator) {
			// @ts-expect-error private
			cookieValidator.config = mergeCookie(
				// @ts-expect-error private
				cookieValidator.config,
				config,
			);
		} else {
			cookieValidator = getSchemaValidator(t.Cookie({}), {
				dynamic,
				models,
				additionalProperties: true,
			});

			// @ts-expect-error private
			cookieValidator.config = defaultConfig;
		}
	}

	return cookieValidator;
};
