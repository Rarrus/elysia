const KindSymbol = Symbol.for("TypeBox.Kind");

export const hasType = (type: string, schema: TAnySchema) => {
	if (!schema) return;

	if (KindSymbol in schema && schema[KindSymbol] === type) return true;

	if (schema.type === "object") {
		const properties = schema.properties as Record<string, TAnySchema>;
		for (const key of Object.keys(properties)) {
			const property = properties[key];

			if (property.type === "object") {
				if (hasType(type, property)) return true;
			} else if (property.anyOf) {
				for (let i = 0; i < property.anyOf.length; i++)
					if (hasType(type, property.anyOf[i])) return true;
			}

			if (KindSymbol in property && property[KindSymbol] === type) return true;
		}

		return false;
	}

	return (
		schema.properties &&
		KindSymbol in schema.properties &&
		schema.properties[KindSymbol] === type
	);
};

export const hasProperty = (expectedProperty: string, schema: TAnySchema) => {
	if (!schema) return;

	if (schema.type === "object") {
		const properties = schema.properties as Record<string, TAnySchema>;

		if (!properties) return false;

		for (const key of Object.keys(properties)) {
			const property = properties[key];

			if (expectedProperty in property) return true;

			if (property.type === "object") {
				if (hasProperty(expectedProperty, property)) return true;
			} else if (property.anyOf) {
				for (let i = 0; i < property.anyOf.length; i++) {
					if (hasProperty(expectedProperty, property.anyOf[i])) return true;
				}
			}
		}

		return false;
	}

	return expectedProperty in schema;
};

const TransformSymbol = Symbol.for("TypeBox.Transform");

export const hasTransform = (schema: TAnySchema) => {
	if (!schema) return;

	if (schema.type === "object" && schema.properties) {
		const properties = schema.properties as Record<string, TAnySchema>;
		for (const key of Object.keys(properties)) {
			const property = properties[key];

			if (property.type === "object") {
				if (hasTransform(property)) return true;
			} else if (property.anyOf) {
				for (let i = 0; i < property.anyOf.length; i++)
					if (hasTransform(property.anyOf[i])) return true;
			}

			const hasTransformSymbol = TransformSymbol in property;
			if (hasTransformSymbol) return true;
		}

		return false;
	}

	return (
		TransformSymbol in schema ||
		(schema.properties && TransformSymbol in schema.properties)
	);
};

export const hasAdditionalProperties = (
	_schema: TAnySchema | TypeCheck<any>,
) => {
	if (!_schema) return false;

	// @ts-expect-error private property
	const schema: TAnySchema = (_schema as TypeCheck<any>)?.schema ?? _schema;

	if (schema.anyOf) return schema.anyOf.some(hasAdditionalProperties);
	if (schema.someOf) return schema.someOf.some(hasAdditionalProperties);
	if (schema.allOf) return schema.allOf.some(hasAdditionalProperties);
	if (schema.not) return schema.not.some(hasAdditionalProperties);

	if (schema.type === "object") {
		const properties = schema.properties as Record<string, TAnySchema>;

		if ("additionalProperties" in schema) return schema.additionalProperties;
		if ("patternProperties" in schema) return false;

		for (const key of Object.keys(properties)) {
			const property = properties[key];

			if (property.type === "object") {
				if (hasAdditionalProperties(property)) return true;
			} else if (property.anyOf) {
				for (let i = 0; i < property.anyOf.length; i++)
					if (hasAdditionalProperties(property.anyOf[i])) return true;
			}

			return property.additionalProperties;
		}

		return false;
	}

	return false;
};

export const hasReturn = (fn: string | HookContainer<any> | Function) => {
	const fnLiteral =
		typeof fn === "object"
			? fn.fn.toString()
			: typeof fn === "string"
				? fn.toString()
				: fn;

	const parenthesisEnd = fnLiteral.indexOf(")");

	// Is direct arrow function return eg. () => 1
	if (
		fnLiteral.charCodeAt(parenthesisEnd + 2) === 61 &&
		fnLiteral.charCodeAt(parenthesisEnd + 5) !== 123
	) {
		return true;
	}

	return fnLiteral.includes("return");
};
