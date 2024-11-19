export interface ReplaceSchemaTypeOptions {
	from: TSchema;
	to(options: Object): TSchema;
	excludeRoot?: boolean;
	rootOnly?: boolean;
	/**
	 * Traverse until object is found except root object
	 **/
	untilObjectFound?: boolean;
}
