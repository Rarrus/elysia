import { describe, expect, it } from 'bun:test'

import { Elysia } from '../../src/class/Elysia'
import { req } from '../utils'

const scoped = new Elysia({
	name: 'scoped',
	scoped: true
})
	.state('inner', 0)
	.state('outer', 0)
	.get('/scoped', ({ store }) => ({
		outer: store.outer,
		inner: ++store.inner
	}))

describe('Scoped', () => {
	it('sync store', async () => {
		const app = new Elysia()
			.state('outer', 0)
			.use(scoped)
			.get('/', ({ store }) => ++store.outer)

		expect(await app.handle(req('/')).then((x) => x.text())).toBe('1')
		expect(await app.handle(req('/scoped')).then((x) => x.json())).toEqual({
			outer: 1,
			inner: 1
		})
		expect(await app.handle(req('/')).then((x) => x.text())).toBe('2')
	})

	it('encapsulate request event', async () => {
		let count = 0

		const scoped = new Elysia({
			name: 'scoped',
			scoped: true
		})
			.onRequest(() => {
				count++
			})
			.get('/scoped', () => 'A')

		const app = new Elysia().use(scoped).get('/', () => 'A')

		await app.handle(req('/'))
		await app.handle(req('/scoped'))

		expect(count).toBe(1)
	})

	it('encapsulate afterhandle event', async () => {
		let count = 0

		const scoped = new Elysia({
			name: 'scoped',
			scoped: true
		})
			.onAfterHandle(() => {
				count++
			})
			.get('/scoped', () => 'A')

		const app = new Elysia().use(scoped).get('/', () => 'A')

		await app.handle(req('/'))
		await app.handle(req('/scoped'))

		expect(count).toBe(1)
	})

	// TODO: Possibly Elysia 1.1, no promise tee-hee (finger-crossed)
	// it('multiple scoped events', async () => {
	// 	const first = new Elysia({ name: 'first', scoped: true }).get(
	// 		'/first',
	// 		() => 'first'
	// 	)

	// 	const second = new Elysia({ name: 'second', scoped: true }).get(
	// 		'/second',
	// 		() => 'second'
	// 	)

	// 	const app = new Elysia().use(first).use(second)

	// 	const firstResponse = await app.handle(req('/first'))
	// 	const secondResponse = await app.handle(req('/second'))

	// 	const firstText = await firstResponse.text()
	// 	const secondText = await secondResponse.text()

	// 	expect(firstText).toBe('first')
	// 	expect(secondText).toBe('second')
	// })

	it('Multiple scopes registering all routes', async () => {
		const app = new Elysia()

		const plugin = new Elysia({
			prefix: 'Plugin',
			scoped: true
		}).get('/testPrivate', () => 'OK')

		const plugin2 = new Elysia({
			prefix: 'PluginNext',
			scoped: true
		}).get('/testPrivate', () => 'OK')

		app.use(plugin).use(plugin2)

		const res = await app.handle(req('/Plugin/testPrivate'))

		expect(res.status).toBe(200)

		const res1 = await app.handle(req('/PluginNext/testPrivate'))
		expect(res1.status).toBe(200)
	})
})
