const createReport = ({
	context = "c",
	trace,
	addFn,
}: {
	context?: string;
	trace: (TraceHandler | HookContainer<TraceHandler>)[];
	addFn(string: string): void;
}) => {
	if (!trace.length)
		return () => {
			return {
				resolveChild() {
					return () => {};
				},
				resolve() {},
			};
		};

	for (let i = 0; i < trace.length; i++)
		addFn(
			`let report${i}, reportChild${i}, reportErr${i}, reportErrChild${i}; let trace${i} = ${context}[ELYSIA_TRACE]?.[${i}] ?? trace[${i}](${context});\n`,
		);

	return (
		event: TraceEvent,
		{
			name,
			total = 0,
		}: {
			name?: string;
			attribute?: string;
			total?: number;
		} = {},
	) => {
		// ? For debug specific event
		// if (event !== 'mapResponse')
		// 	return {
		// 		resolveChild() {
		// 			return () => {}
		// 		},
		// 		resolve() {}
		// 	}

		if (!name) name = "anonymous";

		const reporter = event === "error" ? "reportErr" : "report";

		for (let i = 0; i < trace.length; i++)
			addFn(
				`\n${reporter}${i} = trace${i}.${event}({` +
					`id,` +
					`event: '${event}',` +
					`name: '${name}',` +
					`begin: performance.now(),` +
					`total: ${total}` +
					`})\n`,
			);

		return {
			resolve() {
				for (let i = 0; i < trace.length; i++)
					addFn(`\n${reporter}${i}.resolve()\n`);
			},
			resolveChild(name: string) {
				for (let i = 0; i < trace.length; i++)
					addFn(
						`${reporter}Child${i} = ${reporter}${i}.resolveChild?.shift()?.({` +
							`id,` +
							`event: '${event}',` +
							`name: '${name}',` +
							`begin: performance.now()` +
							`})\n`,
					);

				return (binding?: string) => {
					for (let i = 0; i < trace.length; i++) {
						if (binding)
							// Don't report error because HTTP response is expected and not an actual error to look for
							// if (${binding} instanceof ElysiaCustomStatusResponse) {
							//     ${reporter}Child${i}?.(${binding}.error)
							//     ${reporter}Child${i}?.()\n
							// } else
							addFn(`
                             	if (${binding} instanceof Error)
                    				${reporter}Child${i}?.(${binding})
                           		else
                             		${reporter}Child${i}?.()\n`);
						else addFn(`${reporter}Child${i}?.()\n`);
					}
				};
			},
		};
	};
};
