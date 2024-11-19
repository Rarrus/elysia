import {
	DefinitionBase,
	type EphemeralType,
	InputSchema,
	MergeSchema,
	MetadataBase, RouteBase, SingletonBase,
	UnwrapRoute
} from '../types'



export type mergeType<T extends onGeneralType> = MergeSchema<
	T['Schema'],
	MergeSchema<
		T['Volatile']['schema'],
		MergeSchema<T['Ephemeral']['schema'], T['Metadata']['schema']>
	>
>


export type onHandle<T extends onGeneralType> = T['Singleton'] & {
	derive: Ephemeral['derive'] & Volatile['derive']
	resolve: Ephemeral['resolve'] & Volatile['resolve']
}