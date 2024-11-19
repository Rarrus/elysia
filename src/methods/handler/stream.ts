const handleStream = async (
	generator: Generator | AsyncGenerator,
	set?: Context["set"],
	request?: Request,
) => {
	let init = generator.next();
	if (init instanceof Promise) init = await init;

	if (init.done) {
		if (set) return mapResponse(init.value, set, request);
		return mapCompactResponse(init.value, request);
	}

	return new Response(
		new ReadableStream({
			async start(controller) {
				let end = false;

				request?.signal.addEventListener("abort", () => {
					end = true;

					try {
						controller.close();
					} catch {
						// nothing
					}
				});

				if (init.value !== undefined && init.value !== null) {
					if (typeof init.value === "object")
						try {
							controller.enqueue(Buffer.from(JSON.stringify(init.value)));
						} catch {
							controller.enqueue(Buffer.from(init.value.toString()));
						}
					else controller.enqueue(Buffer.from(init.value.toString()));
				}

				for await (const chunk of generator) {
					if (end) break;
					if (chunk === undefined || chunk === null) continue;

					if (typeof chunk === "object")
						try {
							controller.enqueue(Buffer.from(JSON.stringify(chunk)));
						} catch {
							controller.enqueue(Buffer.from(chunk.toString()));
						}
					else controller.enqueue(Buffer.from(chunk.toString()));

					// Wait for the next event loop
					// Otherwise the data will be mixed up
					await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));
				}

				try {
					controller.close();
				} catch {
					// nothing
				}
			},
		}),
		{
			...(set as ResponseInit),
			headers: {
				// Manually set transfer-encoding for direct response, eg. app.handle, eden
				"transfer-encoding": "chunked",
				"content-type": "text/event-stream; charset=utf-8",
				...set?.headers,
			},
		},
	);
};
