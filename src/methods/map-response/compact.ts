export const mapCompactResponse = (
	response: unknown,
	request?: Request,
): Response => {
	switch (response?.constructor?.name) {
		case "String":
			return new Response(response as string);

		case "Blob":
			return handleFile(response as File | Blob);

		case "Array":
			return Response.json(response);

		case "Object":
			return Response.json(response);

		case "ElysiaCustomStatusResponse":
			return mapResponse(
				(response as ElysiaCustomStatusResponse<200>).response,
				{
					status: (response as ElysiaCustomStatusResponse<200>).code,
					headers: {},
				},
			);

		case "ReadableStream":
			request?.signal.addEventListener(
				"abort",
				{
					handleEvent() {
						if (!request?.signal.aborted)
							(response as ReadableStream).cancel(request);
					},
				},
				{
					once: true,
				},
			);

			return new Response(response as ReadableStream, {
				headers: {
					"Content-Type": "text/event-stream; charset=utf-8",
				},
			});

		case undefined:
			if (!response) return new Response("");

			return new Response(JSON.stringify(response), {
				headers: {
					"content-type": "application/json",
				},
			});

		case "Response":
			if ((response as Response).headers.get("transfer-encoding") === "chunked")
				return handleStream(streamResponse(response as Response)) as any;

			return response as Response;

		case "Error":
			return errorToResponse(response as Error);

		case "Promise":
			// @ts-ignore
			return (response as any as Promise<unknown>).then((x) =>
				mapCompactResponse(x, request),
			);

		// ? Maybe response or Blob
		case "Function":
			return mapCompactResponse((response as Function)(), request);

		case "Number":
		case "Boolean":
			return new Response((response as number | boolean).toString());

		case "FormData":
			return new Response(response as FormData);

		default:
			if (response instanceof Response) return response;

			if (response instanceof Promise)
				return response.then((x) => mapCompactResponse(x, request)) as any;

			if (response instanceof Error) return errorToResponse(response as Error);

			if (response instanceof ElysiaCustomStatusResponse)
				return mapResponse(
					(response as ElysiaCustomStatusResponse<200>).response,
					{
						status: (response as ElysiaCustomStatusResponse<200>).code,
						headers: {},
					},
				);

			// @ts-expect-error
			if (typeof response?.next === "function")
				// @ts-expect-error
				return handleStream(response as any, undefined, request);

			// @ts-expect-error
			if (typeof response?.then === "function")
				// @ts-expect-error
				return response.then((x) => mapResponse(x, set)) as any;

			// @ts-expect-error
			if (typeof response?.toResponse === "function")
				return mapCompactResponse((response as any).toResponse());

			if ("charCodeAt" in (response as any)) {
				const code = (response as any).charCodeAt(0);

				if (code === 123 || code === 91) {
					return new Response(JSON.stringify(response), {
						headers: {
							"Content-Type": "application/json",
						},
					}) as any;
				}
			}

			return new Response(response as any);
	}
};
