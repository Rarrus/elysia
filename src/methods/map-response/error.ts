export const errorToResponse = (error: Error, set?: Context["set"]) =>
	new Response(
		JSON.stringify({
			name: error?.name,
			message: error?.message,
			cause: error?.cause,
		}),
		{
			status: set?.status !== 200 ? ((set?.status as number) ?? 500) : 500,
			headers: set?.headers,
		},
	);
