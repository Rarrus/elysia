export const removeColonAlias = (parameter: string) => {
	while (true) {
		const start = parameter.indexOf(":");
		if (start === -1) break;

		let end = parameter.indexOf(",", start);
		if (end === -1) end = parameter.indexOf("}", start) - 1;
		if (end === -2) end = parameter.length;

		parameter = parameter.slice(0, start) + parameter.slice(end);
	}

	return parameter;
};
export const removeDefaultParameter = (parameter: string) => {
	while (true) {
		const index = parameter.indexOf("=");
		if (index === -1) break;

		const commaIndex = parameter.indexOf(",", index);
		const bracketIndex = parameter.indexOf("}", index);

		const end =
			[commaIndex, bracketIndex]
				.filter((i) => i > 0)
				.sort((a, b) => a - b)[0] || -1;

		if (end === -1) {
			parameter = parameter.slice(0, index);

			break;
		}

		parameter = parameter.slice(0, index) + parameter.slice(end);
	}

	return parameter
		.split(",")
		.map((i) => i.trim())
		.join(", ");
};
