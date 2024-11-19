import {
	DefinitionBase,
	EphemeralType,
	MergeSchema,
	MetadataBase,
	Prettify,
	RouteBase,
	SchemaValidator,
	Singleton
} from '../../types'
import type { Elysia } from '../Elysia'
import { mergeSchemaValidator, promoteEvent } from '../../utils'

export default class As {
	[x: string]: any

	as<const BasePath extends string, const Scoped extends boolean>(
		type: 'global'
	): Elysia<
		BasePath,
		Scoped,
		{
			decorator: Singleton['decorator']
			store: Singleton['store']
			derive: Prettify<Singleton['derive'] & EphemeralType['derive']>
			resolve: Prettify<
				Singleton['resolve'] &
					Ephemeral['resolve'] &
					Volatile['resolve']
			>
		},
		DefinitionBase,
		{
			schema: MergeSchema<
				MergeSchema<EphemeralType['schema'], EphemeralType['schema']>,
				MetadataBase['schema']
			>
			macro: MetadataBase['macro']
			macroFn: MetadataBase['macroFn']
		},
		RouteBase,
		{
			derive: {}
			resolve: {}
			schema: {}
		},
		{
			derive: {}
			resolve: {}
			schema: {}
		}
	>

	as<const BasePath extends string, const Scoped extends boolean>(
		type: 'plugin'
	): Elysia<
		BasePath,
		Scoped,
		Singleton,
		DefinitionBase,
		MetadataBase,
		RouteBase,
		{
			derive: Prettify<EphemeralType['derive']>
			resolve: Prettify<EphemeralType['resolve']>
			schema: MergeSchema<
				EphemeralType['schema'],
				EphemeralType['schema']
			>
		},
		{
			derive: {}
			resolve: {}
			schema: {}
		}
	>

	as(type: 'plugin' | 'global') {
		const castType = ({ plugin: 'scoped', global: 'global' } as const)[type]

		promoteEvent(this.event.parse, castType)
		promoteEvent(this.event.transform, castType)
		promoteEvent(this.event.beforeHandle, castType)
		promoteEvent(this.event.afterHandle, castType)
		promoteEvent(this.event.mapResponse, castType)
		promoteEvent(this.event.afterResponse, castType)
		promoteEvent(this.event.trace, castType)
		promoteEvent(this.event.error, castType)

		if (type === 'plugin') {
			this.validator.scoped = mergeSchemaValidator(
				this.validator.scoped,
				this.validator.local
			)
			this.validator.local = null
		} else if (type === 'global') {
			this.validator.global = mergeSchemaValidator(
				this.validator.global,
				mergeSchemaValidator(
					this.validator.scoped,
					this.validator.local
				) as SchemaValidator
			) as SchemaValidator

			this.validator.scoped = null
			this.validator.local = null
		}

		return this as any
	}
}
