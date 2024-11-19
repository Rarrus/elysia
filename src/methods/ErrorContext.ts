export type ErrorContext<
	in out Route extends RouteSchema = {},
	in out Singleton extends SingletonBase = {
		decorator: {};
		store: {};
		derive: {};
		resolve: {};
	},
	Path extends string | undefined = undefined,
> = Prettify<
	{
		body: Route["body"];
		query: undefined extends Route["query"]
			? Record<string, string | undefined>
			: Route["query"];
		params: undefined extends Route["params"]
			? Path extends `${string}/${":" | "*"}${string}`
				? ResolvePath<Path>
				: { [key in string]: string }
			: Route["params"];
		headers: undefined extends Route["headers"]
			? Record<string, string | undefined>
			: Route["headers"];
		cookie: undefined extends Route["cookie"]
			? Record<string, Cookie<string | undefined>>
			: Record<string, Cookie<string | undefined>> &
					Prettify<
						WithoutNullableKeys<{
							[key in keyof Route["cookie"]]: Cookie<Route["cookie"][key]>;
						}>
					>;

		server: Server | null;
		redirect: Redirect;

		set: {
			headers: HTTPHeaders;
			status?: number | keyof StatusMap;
			redirect?: string;
			/**
			 * ! Internal Property
			 *
			 * Use `Context.cookie` instead
			 */
			cookie?: Record<string, ElysiaCookie>;
		};

		/**
		 * Path extracted from incoming URL
		 *
		 * Represent a value extracted from URL
		 *
		 * @example '/id/9'
		 */
		path: string;
		/**
		 * Path as registered to router
		 *
		 * Represent a path registered to a router, not a URL
		 *
		 * @example '/id/:id'
		 */
		route: string;
		request: Request;
		store: Singleton["store"];
		response: Route["response"];
	} & Singleton["decorator"] &
		Singleton["derive"] &
		Singleton["resolve"]
>;
