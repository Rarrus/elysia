import {
	DefinitionBase,
	EphemeralType,
	InlineHandler,
	InputSchema,
	JoinPath,
	MergeSchema,
	MetadataBase,
	SingletonBase,
	UnwrapRoute
} from '../types'
import { SingletonDerRes } from './syngletonType'
import { GInterface } from '../interface/GInterface'

export type LocalSchema = InputSchema<keyof DefinitionBase['type'] & string>

export type Schema = MergeSchema<
	UnwrapRoute<LocalSchema, DefinitionBase['type']>,
	MergeSchema<
		EphemeralType['schema'],
		MergeSchema<EphemeralType['schema'], MetadataBase['schema']>
	>
>

export type handleType<
	GType extends Pick<
		GType,
		'BasePath' | 'Path' | 'Volatile' | 'Ephemeral'
	>
> = InlineHandler<
	Schema,
	SingletonBase & SingletonDerRes<{Ephemeral : GType['Ephemeral'], Volatile : GType["Volatile"]}>,
	JoinPath<GType['BasePath'], GType['Path']>
>
