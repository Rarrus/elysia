import {
	DefinitionBase,
	EphemeralType,
	MetadataBase,
	Prettify,
	RouteBase,
	SingletonBase
} from '../../types'
import type { Elysia } from '../Elysia'
import { Static, TSchema } from '@sinclair/typebox'
import { t } from '../../type-system'

export default class Model {
	[x: string]: any

	model<
		const BasePath extends string,
		const Scoped extends boolean,
		const Name extends string,
		const Model extends TSchema
	>(
		name: Name,
		model: Model
	): Elysia<
		BasePath,
		Scoped,
		SingletonBase,
		{
			type: Prettify<
				DefinitionBase['type'] & { [name in Name]: Static<Model> }
			>
			error: DefinitionBase['error']
		},
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	model<
		const BasePath extends string,
		const Scoped extends boolean,
		const Recorder extends Record<string, TSchema>
	>(
		record: Recorder
	): Elysia<
		BasePath,
		Scoped,
		SingletonBase,
		{
			type: Prettify<
				DefinitionBase['type'] & {
					[key in keyof Recorder]: Static<Recorder[key]>
				}
			>
			error: DefinitionBase['error']
		},
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	model<
		const BasePath extends string,
		const Scoped extends boolean,
		const NewType extends Record<string, TSchema>
	>(
		mapper: (decorators: {
			[type in keyof DefinitionBase['type']]: ReturnType<
				typeof t.Unsafe<DefinitionBase['type'][type]>
			>
		}) => NewType
	): Elysia<
		BasePath,
		Scoped,
		SingletonBase,
		{
			type: { [x in keyof NewType]: Static<NewType[x]> }
			error: DefinitionBase['error']
		},
		MetadataBase,
		RouteBase,
		EphemeralType,
		EphemeralType
	>

	model(name: string | Record<string, TSchema> | Function, model?: TSchema) {
		switch (typeof name) {
			case 'object':
				Object.entries(name).forEach(([key, value]) => {
					if (!(key in this.DefinitionBase.type))
						this.DefinitionBase.type[key] = value as TSchema
				})

				return this

			case 'function':
				this.DefinitionBase.type = name(this.DefinitionBase.type)

				return this as any
		}

		;(this.DefinitionBase.type as Record<string, TSchema>)[name] = model!

		return this as any
	}
}
