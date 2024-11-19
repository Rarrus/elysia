import {
	BaseMacroFn,
	DefinitionBase,
	EphemeralType,
	MacroManager,
	MacroQueue,
	MacroToProperty,
	MergeSchema,
	MetadataBase,
	RouteBase,
	SingletonBase
} from '../../types'
import type { Elysia } from '../Elysia'
import { checksum } from '../../utils'

export default class Macro {
	[x: string]: any

	macro<
		const BasePath extends string,
		const Scoped extends boolean,
		const NewMacro extends BaseMacroFn
	>(
		macro: (
			route: MacroManager<
				MergeSchema<
					MetadataBase['schema'],
					MergeSchema<
						EphemeralType['schema'],
						EphemeralType['schema']
					>
				>,
				SingletonBase & {
					derive: Partial<EphemeralType['derive']>
					resolve: Partial<EphemeralType['resolve']>
				},
				DefinitionBase['error']
			>
		) => NewMacro
	): Elysia<
		{
			schema: MetadataBase['schema']
			macro: MetadataBase['macro'] & Partial<MacroToProperty<NewMacro>>
			macroFn: MetadataBase['macroFn'] & NewMacro
		}
	> {
		const hook: MacroQueue = {
			checksum: checksum(
				JSON.stringify({
					name: this.config.name,
					seed: this.config.seed,
					content: macro.toString()
				})
			),
			fn: macro as any
		}

		this.extender.macros.push(hook)

		return this as any
	}
}
