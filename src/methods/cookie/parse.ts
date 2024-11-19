export const parseCookie = async (
	set: Context["set"],
	cookieString?: string | null,
	{
		secrets,
		sign,
		...initial
	}: CookieOptions & {
		sign?: true | string | string[];
	} = {},
) => {
	if (!cookieString) return createCookieJar(set, {}, initial);

	const isStringKey = typeof secrets === "string";
	if (sign && sign !== true && !Array.isArray(sign)) sign = [sign];

	const jar: Record<string, ElysiaCookie> = {};

	const cookies = parse(cookieString);
	for (const [name, v] of Object.entries(cookies)) {
		let value = decodeURIComponent(v);

		if (sign === true || sign?.includes(name)) {
			if (!secrets) throw new Error("No secret is provided to cookie plugin");

			if (isStringKey) {
				const temp = await unsignCookie(value as string, secrets);
				if (temp === false) throw new InvalidCookieSignature(name);

				value = temp;
			} else {
				let decoded = true;
				for (let i = 0; i < secrets.length; i++) {
					const temp = await unsignCookie(value as string, secrets[i]);

					if (temp !== false) {
						decoded = true;
						value = temp;
						break;
					}
				}

				if (!decoded) throw new InvalidCookieSignature(name);
			}
		}

		jar[name] = {
			value,
		};
	}

	return createCookieJar(set, jar, initial);
};
