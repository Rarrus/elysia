export type PreContext<
	in out Singleton extends SingletonBase = {
		decorator: {};
		store: {};
		derive: {};
		resolve: {};
	},
> = Prettify<
	{
		store: Singleton["store"];
		request: Request;

		redirect: Redirect;
		server: Server | null;

		set: {
			headers: HTTPHeaders;
			status?: number;
			redirect?: string;
		};

		error: typeof error;
	} & Singleton["decorator"]
>;
