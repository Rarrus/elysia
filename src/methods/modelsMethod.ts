import { TypeCheck } from '../type-system'
import type { TSchema } from '@sinclair/typebox'
import { getSchemaValidator } from '../utils'
import { modelsType } from '../types/modelsType'

export default function modelsMethod(definitionType: Record<string, TSchema>): modelsType {
	const models: Record<string, TypeCheck<TSchema>> = {}

	for (const [name, schema] of Object.entries(definitionType))
		models[name] = getSchemaValidator(
			schema as any
		) as TypeCheck<TSchema>

	return models as modelsType
}