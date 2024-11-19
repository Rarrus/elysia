import { getSchemaValidator } from '../utils'
import { ValidationError } from '../error'
import type { TObject } from '@sinclair/typebox'

export default function envMethod(model: TObject<any>, env = Bun?.env ?? process.env) {
	const validator = getSchemaValidator(model, {
		dynamic: true,
		additionalProperties: true,
		coerce: true
	})

	if (validator.Check(env) === false) {
		const error = new ValidationError('env', model, env)
		throw new Error(error.all.map((x) => x.summary).join('\n'))
	}
}