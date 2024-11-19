import {
	AddPrefix,
	AddPrefixCapitalize,
	AddSuffixCapitalize,
	DefinitionBase,
	SingletonBase
} from '../../types'
import type { Elysia } from '../Elysia'
import { ReplaceTypeElysia } from '../../types/generalType'

type AffixTypeKeys = 'decorator' | 'store' | 'derive' | 'resolve'

export type MergedAffixType<
	Base extends 'prefix' | 'suffix',
	Type extends 'all' | 'decorator' | 'state' | 'model' | 'error',
	Word extends string,
	Singleton extends SingletonBase
> = {
	[K in AffixTypeKeys]: Type extends
		| (K extends 'decorator' ? 'decorator' : 'state')
		| 'all'
		? 'prefix' extends Base
			? Word extends `${string}${'_' | '-' | ' '}`
				? AddPrefix<Word, Singleton[K]>
				: AddPrefixCapitalize<Word, Singleton[K]>
			: AddSuffixCapitalize<Word, Singleton[K]>
		: Singleton[K]
}

export default class Affix {
	[x: string]: any

	affix<
		const BasePath extends string,
		Singleton extends SingletonBase,
		Definitions extends DefinitionBase,
		const Scoped extends boolean,
		const Base extends 'prefix' | 'suffix',
		const Type extends 'all' | 'decorator' | 'state' | 'model' | 'error',
		const Word extends string
	>(
		base: Base,
		type: Type,
		word: Word
	): ReplaceTypeElysia<
		Elysia,
		Singleton,
		MergedAffixType<Base, Type, Word, Singleton>
	> {
		if (word === '') return this as any

		const delimieter = ['_', '-', ' ']
		const capitalize = (word: string) =>
			word[0].toUpperCase() + word.slice(1)

		const joinKey = (base: Base, word: string, suffix: string) => {
			return base === 'prefix'
				? delimieter.includes(suffix.at(-1) ?? '')
					? suffix + word
					: suffix + capitalize(word)
				: delimieter.includes(word.at(-1) ?? '')
					? word + suffix
					: word + capitalize(suffix)
		}

		const remap = (type: 'decorator' | 'state' | 'model' | 'error') => {
			const store: Record<string, any> = {}
			const source =
				type === 'decorator'
					? this.singleton.decorator
					: type === 'state'
						? this.singleton.store
						: type === 'model'
							? this.definitions.type
							: this.definitions.error

			for (const key in source) {
				store[joinKey(word, key)] = source[key]
			}

			if (type === 'decorator') this.singleton.decorator = store
			else if (type === 'state') this.singleton.store = store
			else if (type === 'model') this.definitions.type = store
			else if (type === 'error') this.definitions.error = store
		}

		const types = Array.isArray(type) ? type : [type]

		for (const t of types.some((x) => x === 'all')
			? ['decorator', 'state', 'model', 'error']
			: types) {
			remap(t as 'decorator' | 'state' | 'model' | 'error')
		}

		return this as any
	}

	prefix<
		const Type extends 'all' | 'decorator' | 'state' | 'model' | 'error',
		const Word extends string
	>(type: Type, word: Word) {
		return this.affix('prefix', type, word)
	}

	suffix<
		const Type extends 'all' | 'decorator' | 'state' | 'model' | 'error',
		const Word extends string
	>(type: Type, word: Word) {
		return this.affix('suffix', type, word)
	}
}
