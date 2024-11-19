export async function* streamResponse(response: Response) {
	const body = response.body;

	if (!body) return;

	const reader = body.getReader();
	const decoder = new TextDecoder();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			yield decoder.decode(value);
		}
	} finally {
		reader.releaseLock();
	}
}
