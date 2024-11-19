import { t } from '../../src'
import { Elysia } from '../../src/class/Elysia'
import { describe, it, expect } from 'bun:test'

describe('Coercion - Numberic -> Number', () => {
	it('work', async () => {
		const app = new Elysia().get(
			'/:entityType',
			({ params: { entityType } }) => entityType,
			{
				params: t.Object({
					entityType: t.Number()
				})
			}
		)

		const response = await app.handle(new Request('http://localhost/999'))
		expect(response.status).toBe(200)
	})

	it('handle property', async () => {
		const numberApp = new Elysia()
			.onError(({ code }) => code)
			.get('/:entityType', ({ params: { entityType } }) => entityType, {
				params: t.Object({
					entityType: t.Number({
						minimum: 0,
						maximum: 3,
						multipleOf: 1
					})
				})
			})

		const numericApp = new Elysia()
			.onError(({ code }) => code)
			.get('/:entityType', ({ params: { entityType } }) => entityType, {
				params: t.Object({
					entityType: t.Numeric({
						minimum: 0,
						maximum: 3,
						multipleOf: 1
					})
				})
			})

		async function expectValidResponse(response: Response) {
			expect(response.status).toBe(422)
			const body = await response.text()
			expect(body).not.toBe('999')
			expect(body).toBe('VALIDATION')
		}

		await expectValidResponse(
			await numberApp.handle(new Request('http://localhost/999'))
		)

		await expectValidResponse(
			await numericApp.handle(new Request('http://localhost/999'))
		)
	})
})
