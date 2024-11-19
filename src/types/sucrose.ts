export namespace Sucrose {
	export interface Inference {
		query: boolean;
		headers: boolean;
		body: boolean;
		cookie: boolean;
		set: boolean;
		server: boolean;
	}

	export interface LifeCycle extends Partial<LifeCycleStore> {
		handler?: Handler;
	}
}
