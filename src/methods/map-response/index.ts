const hasHeaderShorthand = "toJSON" in new Headers();

type SetResponse = Omit<Context["set"], "status"> & {
	status: number;
};

export const mapResponse = (
	response: unknown,
	set: Context["set"],
	request?: Request,
): Response => {
	if (
		isNotEmpty(set.headers) ||
		set.status !== 200 ||
		set.redirect ||
		set.cookie
	) {
		if (typeof set.status === "string") set.status = StatusMap[set.status];

		if (set.redirect) {
			set.headers.Location = set.redirect;
			if (!set.status || set.status < 300 || set.status >= 400)
				set.status = 302;
		}

		if (set.cookie && isNotEmpty(set.cookie)) {
			const cookie = serializeCookie(set.cookie);

			if (cookie) set.headers["set-cookie"] = cookie;
		}

		if (set.headers["set-cookie"] && Array.isArray(set.headers["set-cookie"])) {
			set.headers = parseSetCookies(
				new Headers(set.headers) as Headers,
				set.headers["set-cookie"],
			) as any;
		}

		switch (response?.constructor?.name) {
			case "String":
				return new Response(response as string, set as SetResponse);

			case "Blob":
				return handleFile(response as File | Blob, set);

			case "Array":
				return Response.json(response, set as SetResponse);

			case "Object":
				return Response.json(response, set as SetResponse);

			case "ElysiaCustomStatusResponse":
				set.status = (response as ElysiaCustomStatusResponse<200>).code;

				return mapResponse(
					(response as ElysiaCustomStatusResponse<200>).response,
					set,
					request,
				);

			case "ReadableStream":
				if (!set.headers["content-type"]?.startsWith("text/event-stream"))
					set.headers["content-type"] = "text/event-stream; charset=utf-8";

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

				return new Response(response as ReadableStream, set as SetResponse);

			case undefined:
				if (!response) return new Response("", set as SetResponse);

				return Response.json(response, set as SetResponse);

			case "Response":
				let isCookieSet = false;

				if (set.headers instanceof Headers)
					for (const key of set.headers.keys()) {
						if (key === "set-cookie") {
							if (isCookieSet) continue;

							isCookieSet = true;

							for (const cookie of set.headers.getSetCookie()) {
								(response as Response).headers.append("set-cookie", cookie);
							}
						} else
							(response as Response).headers.append(
								key,
								set.headers?.get(key) ?? "",
							);
					}
				else
					for (const key in set.headers)
						(response as Response).headers.append(key, set.headers[key]);

				if ((response as Response).status !== set.status)
					set.status = (response as Response).status;

				if (
					(response as Response).headers.get("transfer-encoding") === "chunked"
				)
					return handleStream(
						streamResponse(response as Response),
						set,
						request,
					) as any;

				return response as Response;

			case "Error":
				return errorToResponse(response as Error, set);

			case "Promise":
				return (response as Promise<any>).then((x) =>
					mapResponse(x, set),
				) as any;

			case "Function":
				return mapResponse((response as Function)(), set);

			case "Number":
			case "Boolean":
				return new Response(
					(response as number | boolean).toString(),
					set as SetResponse,
				);

			case "Cookie":
				if (response instanceof Cookie)
					return new Response(response.value, set as SetResponse);

				return new Response(response?.toString(), set as SetResponse);

			case "FormData":
				return new Response(response as FormData, set as SetResponse);

			default:
				if (response instanceof Response) {
					let isCookieSet = false;

					if (set.headers instanceof Headers)
						for (const key of set.headers.keys()) {
							if (key === "set-cookie") {
								if (isCookieSet) continue;

								isCookieSet = true;

								for (const cookie of set.headers.getSetCookie()) {
									(response as Response).headers.append("set-cookie", cookie);
								}
							} else
								(response as Response).headers.append(
									key,
									set.headers?.get(key) ?? "",
								);
						}
					else
						for (const key in set.headers)
							(response as Response).headers.append(key, set.headers[key]);

					if (hasHeaderShorthand)
						set.headers = ((response as Response).headers as Headers).toJSON();
					else
						for (const [key, value] of (response as Response).headers.entries())
							if (key in set.headers) set.headers[key] = value;

					return response as Response;
				}

				if (response instanceof Promise)
					return response.then((x) => mapResponse(x, set)) as any;

				if (response instanceof Error)
					return errorToResponse(response as Error, set);

				if (response instanceof ElysiaCustomStatusResponse) {
					set.status = (response as ElysiaCustomStatusResponse<200>).code;

					return mapResponse(
						(response as ElysiaCustomStatusResponse<200>).response,
						set,
						request,
					);
				}

				// @ts-expect-error
				if (typeof response?.next === "function")
					// @ts-expect-error
					return handleStream(response as any, set, request);

				// @ts-expect-error
				if (typeof response?.then === "function")
					// @ts-expect-error
					return response.then((x) => mapResponse(x, set)) as any;

				// @ts-expect-error
				if (typeof response?.toResponse === "function")
					return mapResponse((response as any).toResponse(), set);

				if ("charCodeAt" in (response as any)) {
					const code = (response as any).charCodeAt(0);

					if (code === 123 || code === 91) {
						if (!set.headers["Content-Type"])
							set.headers["Content-Type"] = "application/json";

						return new Response(
							JSON.stringify(response),
							set as SetResponse,
						) as any;
					}
				}

				return new Response(response as any, set as SetResponse);
		}
	} else
		switch (response?.constructor?.name) {
			case "String":
				return new Response(response as string);

			case "Blob":
				return handleFile(response as File | Blob, set);

			case "Array":
				return Response.json(response);

			case "Object":
				return Response.json(response, set as SetResponse);

			case "ElysiaCustomStatusResponse":
				set.status = (response as ElysiaCustomStatusResponse<200>).code;

				return mapResponse(
					(response as ElysiaCustomStatusResponse<200>).response,
					set,
					request,
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
				if (
					(response as Response).headers.get("transfer-encoding") === "chunked"
				)
					return handleStream(
						streamResponse(response as Response),
						set,
						request,
					) as any;

				return response as Response;

			case "Error":
				return errorToResponse(response as Error, set);

			case "Promise":
				// @ts-ignore
				return (response as any as Promise<unknown>).then((x) => {
					const r = mapCompactResponse(x, request);

					if (r !== undefined) return r;

					return new Response("");
				});

			// ? Maybe response or Blob
			case "Function":
				return mapCompactResponse((response as Function)(), request);

			case "Number":
			case "Boolean":
				return new Response((response as number | boolean).toString());

			case "Cookie":
				if (response instanceof Cookie)
					return new Response(response.value, set as SetResponse);

				return new Response(response?.toString(), set as SetResponse);

			case "FormData":
				return new Response(response as FormData, set as SetResponse);

			default:
				if (response instanceof Response) return response;

				if (response instanceof Promise)
					return response.then((x) => mapResponse(x, set)) as any;

				if (response instanceof Error)
					return errorToResponse(response as Error, set);

				if (response instanceof ElysiaCustomStatusResponse) {
					set.status = (response as ElysiaCustomStatusResponse<200>).code;

					return mapResponse(
						(response as ElysiaCustomStatusResponse<200>).response,
						set,
						request,
					);
				}

				// @ts-expect-error
				if (typeof response?.next === "function")
					// @ts-expect-error
					return handleStream(response as any, set, request);

				// @ts-expect-error
				if (typeof response?.then === "function")
					// @ts-expect-error
					return response.then((x) => mapResponse(x, set)) as any;

				// @ts-expect-error
				if (typeof response?.toResponse === "function")
					return mapResponse((response as any).toResponse(), set);

				if ("charCodeAt" in (response as any)) {
					const code = (response as any).charCodeAt(0);

					if (code === 123 || code === 91) {
						if (!set.headers["Content-Type"])
							set.headers["Content-Type"] = "application/json";

						return new Response(
							JSON.stringify(response),
							set as SetResponse,
						) as any;
					}
				}

				return new Response(response as any);
		}
};
