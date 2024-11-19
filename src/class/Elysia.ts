import type { Server } from "bun";
import { type TObject, type TSchema } from "@sinclair/typebox";

import type { Context } from "../context";
import { type Sucrose } from "../sucrose";

import { version as _version } from "../../package.json";

import {
	createMacroManager,
	mergeDeep,
	mergeSchemaValidator,
	PromiseGroup,
	traceBackMacro,
} from "../utils";

import { composeGeneralHandler } from "../compose";

import { createDynamicHandler } from "../dynamic-handle";

import type {
	Checksum,
	DefinitionBase,
	ElysiaConfig,
	EphemeralT,
	HigherOrderFunction,
	HookContainer,
	InternalRoute,
	LifeCycleStore,
	LocalHook,
	MacroManager,
	MacroQueue,
	MaybePromise,
	MetadataBase,
	RouteBase,
	SingletonBase,
	ValidatorLayer,
	VolatileT,
} from "../types";
import envMethod from "../methods/envMethod";
import modelsMethod from "../methods/modelsMethod";
import wrapMethod from "../methods/wrapMethod";
import setupRouter from "../methods/setup/setupRouter";
import setupEvent from "../methods/setup/setupEvent";
import setupInference from "../methods/setup/setupInference";
import setupConfig from "../methods/setup/setupConfig";

/**
 * ### Elysia Server
 * Main instance to create web server using Elysia
 *
 * ---
 * @example
 * ```typescript
 * import { Elysia } from 'elysia'
 *
 * new Elysia()
 *     .get("/", () => "Hello")
 *     .listen(3000)
 * ```
 */

export default class Elysia<
	const in out Volatile extends VolatileT,
	const in out BasePath extends string = "",
	const in out Scoped extends boolean = false,
	const in out Singleton extends SingletonBase = {
		decorator: {};
		store: {};
		derive: {};
		resolve: {};
	},
	const in out Definitions extends DefinitionBase = {
		type: {};
		error: {};
	},
	const in out Metadata extends MetadataBase = {
		schema: {};
		macro: {};
		macroFn: {};
	},
	const out Routes extends RouteBase = {},
	const in out Ephemeral extends EphemeralT = {
		derive: {};
		resolve: {};
		schema: {};
		access: "scoped";
	},
> {
	static version = _version;
	config: ElysiaConfig<BasePath, Scoped>;
	server: Server | null = null;
	_types = {
		Prefix: "" as BasePath,
		Scoped: false as Scoped,
		Singleton: {} as Singleton,
		Definitions: {} as Definitions,
		Metadata: {} as Metadata,
	};
	_ephemeral = {} as Ephemeral;
	_volatile = {} as Volatile;
	version = _version;
	event: LifeCycleStore = setupEvent();
	router = setupRouter();
	singleton = {
		decorator: {},
		store: {},
		derive: {},
		resolve: {},
	} as Singleton;
	definitions = {
		type: {} as Record<string, TSchema>,
		error: {} as Record<string, Error>,
	};
	extender = {
		macros: <MacroQueue[]>[],
		higherOrderFunctions: <HookContainer<HigherOrderFunction>[]>[],
	};
	inference: Sucrose.Inference = setupInference();
	protected validator: ValidatorLayer = {
		global: null,
		scoped: null,
		local: null,
		getCandidate() {
			return mergeSchemaValidator(
				mergeSchemaValidator(this.global, this.scoped),
				this.local,
			);
		},
	};
	protected telemetry = {
		stack: undefined as string | undefined,
	};
	protected routeTree = new Map<string, number>();
	private dependencies: Record<string, Checksum[]> = {};
	private setHeaders?: Context["set"]["headers"];

	constructor(config: ElysiaConfig<BasePath, Scoped> = {}) {
		if (config.tags) {
			if (!config.detail)
				config.detail = {
					tags: config.tags,
				};
			else config.detail.tags = config.tags;
		}

		if (config.nativeStaticResponse === undefined)
			config.nativeStaticResponse = true;

		this.config = setupConfig(config);

		if (config?.analytic && (config?.name || config?.seed !== undefined))
			this.telemetry.stack = new Error().stack;
	}

	_routes: Routes = {} as any;

	get routes(): InternalRoute[] {
		return this.router.history;
	}

	get store(): Singleton["store"] {
		return this.singleton.store;
	}

	get decorator(): Singleton["decorator"] {
		return this.singleton.decorator;
	}

	get _scoped() {
		return this.config.scoped as Scoped;
	}

	get _basePath() {
		return this.config.prefix as BasePath;
	}

	get models(): modelsType {
		return modelsMethod(this.definitions.type);
	}

	/**
	 * Wait until all lazy loaded modules all load is fully
	 */
	get modules() {
		return Promise.all(this.promisedModules.promises);
	}

	private _promisedModules: PromiseGroup | undefined;

	private get promisedModules() {
		if (!this._promisedModules) this._promisedModules = new PromiseGroup();

		return this._promisedModules;
	}

	handle = async (request: Request) => this.fetch(request);

	/**
	 * Use handle can be either sync or async to save performance.
	 *
	 * Beside benchmark purpose, please use 'handle' instead.
	 */
	fetch = (request: Request): MaybePromise<Response> => {
		return (this.fetch = this.config.aot
			? composeGeneralHandler(this)
			: createDynamicHandler(this))(request);
	};

	env(model: TObject<any>, env = Bun?.env ?? process.env) {
		envMethod(model, env);
		return this;
	}

	/**
	 * @private DO_NOT_USE_OR_YOU_WILL_BE_FIRE
	 *
	 * ! Do not use unless you now exactly what you are doing
	 * ? Add Higher order function to Elysia.fetch
	 */

	wrap(fn: HigherOrderFunction) {
		const config = this.config;
		wrapMethod(fn, config.name, config.seed);
		return this;
	}

	headers(header: Context["set"]["headers"] | undefined) {
		if (!header) return this;

		if (!this.setHeaders) this.setHeaders = {};

		this.setHeaders = mergeDeep(this.setHeaders, header);

		return this;
	}

	compile() {
		this.fetch = this.config.aot
			? composeGeneralHandler(this)
			: createDynamicHandler(this);

		if (typeof this.server?.reload === "function")
			this.server.reload({
				...(this.server || {}),
				fetch: this.fetch,
			});

		return this;
	}

	getServer() {
		return this.server;
	}

	protected getGlobalRoutes(): InternalRoute[] {
		return this.router.history;
	}

	private applyMacro(localHook: LocalHook<any, any, any, any, any, any, any>) {
		if (this.extender.macros.length) {
			const manage = createMacroManager({
				globalHook: this.event,
				localHook,
			});

			const manager: MacroManager = {
				events: {
					global: this.event,
					local: localHook,
				},
				onParse: manage("parse") as any,
				onTransform: manage("transform") as any,
				onBeforeHandle: manage("beforeHandle") as any,
				onAfterHandle: manage("afterHandle") as any,
				mapResponse: manage("mapResponse") as any,
				onAfterResponse: manage("afterResponse") as any,
				onError: manage("error") as any,
			};

			for (const macro of this.extender.macros)
				traceBackMacro(macro.fn(manager), localHook);
		}
	}

	private outerErrorHandler = (error: Error) =>
		new Response(error.message || error.name || "Error", {
			// @ts-ignore
			status: error?.status ?? 500,
		});
}

export { Elysia };
