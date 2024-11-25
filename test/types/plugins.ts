import { t } from '../../src'
import { Elysia } from '../../src/class/Elysia'

const plugin = async (app: Elysia) =>
	app.decorate('decorate', 'a').state('state', 'a').model({
		string: t.String()
	})

export default plugin
