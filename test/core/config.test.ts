import { describe, expect, it } from 'bun:test'
import { Elysia } from '../../src/class/Elysia'

describe('config', () => {
	it('standard hostname', async () => {
		const app = new Elysia({ handler: { standardHostname: false } }).get(
			'/a',
			'a'
		)

		const response = await app
			.handle(new Request('http://a/a'))
			.then((x) => x.text())

		expect(response).toBe('a')
	})
})
