export const signCookie = async (val: string, secret: string | null) => {
	if (typeof val !== "string")
		throw new TypeError("Cookie value must be provided as a string.");

	if (secret === null) throw new TypeError("Secret key must be provided.");

	const secretKey = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const hmacBuffer = await crypto.subtle.sign(
		"HMAC",
		secretKey,
		encoder.encode(val),
	);

	return (
		val + "." + removeTrailingEquals(Buffer.from(hmacBuffer).toString("base64"))
	);
};

export const unsignCookie = async (input: string, secret: string | null) => {
	if (typeof input !== "string")
		throw new TypeError("Signed cookie string must be provided.");

	if (null === secret) throw new TypeError("Secret key must be provided.");

	const tentativeValue = input.slice(0, input.lastIndexOf("."));
	const expectedInput = await signCookie(tentativeValue, secret);

	return expectedInput === input ? tentativeValue : false;
};
