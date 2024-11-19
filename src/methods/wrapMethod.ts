import type { HigherOrderFunction } from '../types'
import { checksum } from '../utils'

export default function wrapMethod(
	fn: HigherOrderFunction,
	configName: string | undefined,
	configSeed: unknown
) {
	return {
		checksum: checksum(
			JSON.stringify({
				name: configName,
				seed: configSeed,
				content: fn.toString()
			})
		),
		fn
	}
}
