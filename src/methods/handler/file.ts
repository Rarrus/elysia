const handleFile = (response: File | Blob, set?: Context["set"]) => {
	const size = response.size;

	if (
		(!set && size) ||
		(size &&
			set &&
			set.status !== 206 &&
			set.status !== 304 &&
			set.status !== 412 &&
			set.status !== 416)
	) {
		if (set && isNotEmpty(set.headers)) {
			if (set.headers instanceof Headers)
				if (hasHeaderShorthand)
					set.headers = (set.headers as unknown as Headers).toJSON();
				else
					for (const [key, value] of set.headers.entries())
						if (key in set.headers) set.headers[key] = value;

			return new Response(response as Blob, {
				status: set.status as number,
				headers: Object.assign(
					{
						"accept-ranges": "bytes",
						"content-range": `bytes 0-${size - 1}/${size}`,
					},
					set.headers,
				),
			});
		}

		return new Response(response as Blob, {
			headers: {
				"accept-ranges": "bytes",
				"content-range": `bytes 0-${size - 1}/${size}`,
				"transfer-encoding": "chunked",
			},
		});
	}

	return new Response(response as Blob);
};
