export type DynamicHandler = {
	handle: Handler<any, any>;
	content?: string;
	hooks: LifeCycleStore;
	validator?: SchemaValidator;
};
