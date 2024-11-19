const createProcess = () => {
	const { promise, resolve } = Promise.withResolvers<TraceProcess>();
	const { promise: end, resolve: resolveEnd } = Promise.withResolvers<number>();
	const { promise: error, resolve: resolveError } =
		Promise.withResolvers<Error | null>();

	const callbacks = <Function[]>[];
	const callbacksEnd = <Function[]>[];

	return [
		(callback?: Function) => {
			if (callback) callbacks.push(callback);

			return promise;
		},
		(process: TraceStream) => {
			const processes = <((callback?: Function) => Promise<void>)[]>[];
			const resolvers = <((process: TraceStream) => () => void)[]>[];

			// When error is return but not thrown
			let groupError: Error | null = null;

			for (let i = 0; i < (process.total ?? 0); i++) {
				const { promise, resolve } = Promise.withResolvers<void>();
				const { promise: end, resolve: resolveEnd } =
					Promise.withResolvers<number>();
				const { promise: error, resolve: resolveError } =
					Promise.withResolvers<Error | null>();

				const callbacks = <Function[]>[];
				const callbacksEnd = <Function[]>[];

				processes.push((callback?: Function) => {
					if (callback) callbacks.push(callback);

					return promise;
				});

				resolvers.push((process: TraceStream) => {
					const result = {
						...process,
						end,
						error,
						index: i,
						onStop(callback?: Function) {
							if (callback) callbacksEnd.push(callback);

							return end;
						},
					} as any;

					resolve(result);
					for (let i = 0; i < callbacks.length; i++) callbacks[i](result);

					return (error: Error | null = null) => {
						const end = performance.now();

						// Catch return error
						if (error) groupError = error;

						const detail = {
							end,
							error,
							get elapsed() {
								return end - process.begin;
							},
						};

						for (let i = 0; i < callbacksEnd.length; i++)
							callbacksEnd[i](detail);

						resolveEnd(end);
						resolveError(error);
					};
				});
			}

			const result = {
				...process,
				end,
				error,
				onEvent(callback?: Function) {
					for (let i = 0; i < processes.length; i++) processes[i](callback);
				},
				onStop(callback?: Function) {
					if (callback) callbacksEnd.push(callback);

					return end;
				},
			} as any;

			resolve(result);
			for (let i = 0; i < callbacks.length; i++) callbacks[i](result);

			return {
				resolveChild: resolvers,
				resolve(error: Error | null = null) {
					const end = performance.now();

					// If error is return, parent group will not catch an error
					// but the child group will catch the error
					if (!error && groupError) error = groupError;

					const detail = {
						end,
						error,
						get elapsed() {
							return end - process.begin;
						},
					};

					for (let i = 0; i < callbacksEnd.length; i++) callbacksEnd[i](detail);

					resolveEnd(end);
					resolveError(error);
				},
			};
		},
	] as const;
};
