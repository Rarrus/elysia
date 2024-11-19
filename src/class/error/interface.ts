interface ErrorInterface<Definitions extends DefinitionBase> {
	PrototypeError: {
		prototype: Error<Definitions>;
	};
	RecordsPrototypeError: Record<string, PrototypeError>;
	AllErrors:
		| ErrorInterface<Definitions>["RecordsPrototypeError"]
		| Record<string, Error<Definitions>>;
}

interface SetupError<Definitions extends DefinitionBase, T extends AllErrors> {
	errorOrLiteral: T extends {
		prototype: infer LiteralError extends Error<Definitions>;
	}
		? LiteralError
		: T;

	setup: {
		type: Definitions["type"];
		error: {
			[K in keyof T]: T[K] extends AllErrors
				? SetupError<Definitions, T>["errorOrLiteral"]
				: never;
		} & Definitions["error"];
	};
}
