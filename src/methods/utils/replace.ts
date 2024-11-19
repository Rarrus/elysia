export const replaceSchemaType = (
	schema: TSchema,
	options: MaybeArray<ReplaceSchemaTypeOptions>,
	root = true,
) => {
	if (!Array.isArray(options)) return _replaceSchemaType(schema, options, root);

	for (const option of options)
		schema = _replaceSchemaType(schema, option, root);

	return schema;
};

const _replaceSchemaType = (
	schema: TSchema,
	options: ReplaceSchemaTypeOptions,
	root = true,
) => {
	if (!schema) return schema;
	if (options.untilObjectFound && !root && schema.type === "object")
		return schema;

	const fromSymbol = options.from[Kind];

	if (schema.oneOf) {
		for (let i = 0; i < schema.oneOf.length; i++)
			schema.oneOf[i] = _replaceSchemaType(schema.oneOf[i], options, root);

		return schema;
	}

	if (schema.anyOf) {
		for (let i = 0; i < schema.anyOf.length; i++)
			schema.anyOf[i] = _replaceSchemaType(schema.anyOf[i], options, root);

		return schema;
	}

	if (schema.allOf) {
		for (let i = 0; i < schema.allOf.length; i++)
			schema.allOf[i] = _replaceSchemaType(schema.allOf[i], options, root);

		return schema;
	}

	if (schema.not) {
		for (let i = 0; i < schema.not.length; i++)
			schema.not[i] = _replaceSchemaType(schema.not[i], options, root);

		return schema;
	}

	const isRoot = root && !!options.excludeRoot;

	if (schema[Kind] === fromSymbol) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { anyOf, oneOf, allOf, not, properties, items, ...rest } = schema;
		const to = options.to(rest);

		// If t.Transform is used, we need to re-calculate Encode, Decode
		let transform;

		const composeProperties = (v: TSchema) => {
			if (properties && v.type === "object") {
				const newProperties = <Record<string, unknown>>{};
				for (const [key, value] of Object.entries(properties))
					newProperties[key] = _replaceSchemaType(
						value as TSchema,
						options,
						false,
					);

				return {
					...rest,
					...v,
					properties: newProperties,
				};
			}

			if (items && v.type === "array")
				return {
					...rest,
					...v,
					items: _replaceSchemaType(items, options, false),
				};

			const value = {
				...rest,
				...v,
			};

			// Remove required as it's not object
			delete value["required"];

			// Create default value for ObjectString
			if (
				properties &&
				v.type === "string" &&
				v.format === "ObjectString" &&
				v.default === "{}"
			) {
				transform = t.ObjectString(properties, rest);
				value.default = JSON.stringify(Value.Create(t.Object(properties)));
				value.properties = properties;
			}

			// Create default value for ArrayString
			if (
				items &&
				v.type === "string" &&
				v.format === "ArrayString" &&
				v.default === "[]"
			) {
				transform = t.ArrayString(items, rest);
				value.default = JSON.stringify(Value.Create(t.Array(items)));
				value.items = items;
			}

			return value;
		};

		if (isRoot) {
			if (properties) {
				const newProperties = <Record<string, unknown>>{};
				for (const [key, value] of Object.entries(properties))
					newProperties[key] = _replaceSchemaType(
						value as TSchema,
						options,
						false,
					);

				return {
					...rest,
					properties: newProperties,
				};
			} else if (items?.map)
				return {
					...rest,
					items: items.map((v: TSchema) =>
						_replaceSchemaType(v, options, false),
					),
				};

			return rest;
		}

		if (to.anyOf)
			for (let i = 0; i < to.anyOf.length; i++)
				to.anyOf[i] = composeProperties(to.anyOf[i]);
		else if (to.oneOf)
			for (let i = 0; i < to.oneOf.length; i++)
				to.oneOf[i] = composeProperties(to.oneOf[i]);
		else if (to.allOf)
			for (let i = 0; i < to.allOf.length; i++)
				to.allOf[i] = composeProperties(to.allOf[i]);
		else if (to.not)
			for (let i = 0; i < to.not.length; i++)
				to.not[i] = composeProperties(to.not[i]);

		if (transform) to[TransformKind as any] = transform[TransformKind];

		if (to.anyOf || to.oneOf || to.allOf || to.not) return to;

		if (properties) {
			const newProperties = <Record<string, unknown>>{};
			for (const [key, value] of Object.entries(properties))
				newProperties[key] = _replaceSchemaType(
					value as TSchema,
					options,
					false,
				);

			return {
				...rest,
				...to,
				properties: newProperties,
			};
		} else if (items?.map)
			return {
				...rest,
				...to,
				items: items.map((v: TSchema) => _replaceSchemaType(v, options, false)),
			};

		return {
			...rest,
			...to,
		};
	}

	const properties = schema?.properties as Record<string, TSchema>;

	if (properties && root && options.rootOnly !== true)
		for (const [key, value] of Object.entries(properties)) {
			switch (value[Kind]) {
				case fromSymbol:
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { anyOf, oneOf, allOf, not, type, ...rest } = value;
					const to = options.to(rest);

					if (to.anyOf)
						for (let i = 0; i < to.anyOf.length; i++)
							to.anyOf[i] = { ...rest, ...to.anyOf[i] };
					else if (to.oneOf)
						for (let i = 0; i < to.oneOf.length; i++)
							to.oneOf[i] = { ...rest, ...to.oneOf[i] };
					else if (to.allOf)
						for (let i = 0; i < to.allOf.length; i++)
							to.allOf[i] = { ...rest, ...to.allOf[i] };
					else if (to.not)
						for (let i = 0; i < to.not.length; i++)
							to.not[i] = { ...rest, ...to.not[i] };

					properties[key] = {
						...rest,
						..._replaceSchemaType(rest, options, false),
					};
					break;

				case "Object":
				case "Union":
					properties[key] = _replaceSchemaType(value, options, false);
					break;

				default:
					if (value.items)
						for (let i = 0; i < value.items.length; i++) {
							value.items[i] = _replaceSchemaType(
								value.items[i],
								options,
								false,
							);
						}
					else if (value.anyOf || value.oneOf || value.allOf || value.not)
						properties[key] = _replaceSchemaType(value, options, false);
					break;
			}
		}

	return schema;
};
