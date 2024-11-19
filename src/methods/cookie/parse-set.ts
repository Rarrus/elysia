export const parseSetCookies = (headers: Headers, setCookie: string[]) => {
	if (!headers) return headers;

	headers.delete("set-cookie");

	for (let i = 0; i < setCookie.length; i++) {
		const index = setCookie[i].indexOf("=");

		headers.append(
			"set-cookie",
			`${setCookie[i].slice(0, index)}=${setCookie[i].slice(index + 1) || ""}`,
		);
	}

	return headers;
};
