export class ElysiaCustomStatusResponse<
	const Code extends number | keyof StatusMap,
	const T = Code extends keyof InvertedStatusMap
		? InvertedStatusMap[Code]
		: Code,
	const Status extends Code extends keyof StatusMap
		? StatusMap[Code]
		: Code = Code extends keyof StatusMap ? StatusMap[Code] : Code,
> {
	code: Status;
	response: T;

	constructor(code: Code, response: T) {
		const res =
			response ??
			(code in InvertedStatusMap
				? // @ts-expect-error Always correct
					InvertedStatusMap[code]
				: code);

		// @ts-ignore Trust me bro
		this.code = StatusMap[code] ?? code;
		this.response = res;
	}
}
