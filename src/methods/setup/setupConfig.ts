import type { ElysiaConfig } from '../../types'

export default function setupConfig<
	BasePath extends string,
	Scoped extends boolean
>(config: ElysiaConfig<BasePath, Scoped>) {
	return {
		prefix: '',
		aot: true,
		strictPath: false,
		global: false,
		analytic: false,
		normalize: true,
		...config,
		cookie: {
			path: '/',
			...config?.cookie
		},
		experimental: config?.experimental ?? {},
		seed: config?.seed === undefined ? '' : config?.seed
	} as any
}
