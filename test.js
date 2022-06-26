import test from 'ava';
import timeSpan from 'time-span';
import inRange from 'in-range';
import makeAsynchronous from './index.js';

test('main', async t => {
	const fixture = {x: '🦄'};
	const end = timeSpan();

	const result = await makeAsynchronous(fixture => {
		let x = '1';

		while (true) { // eslint-disable-line no-constant-condition
			x += Math.random() < 0.5 ? Date.now().toString() : '0';

			if (x >= 9_999_999_999_999) {
				break;
			}
		}

		return fixture;
	})(fixture);

	t.true(inRange(end(), {start: 10, end: 1000}), `${end()}`);
	t.deepEqual(result, fixture);
});

test('error', async t => {
	await t.throwsAsync(
		makeAsynchronous(() => {
			throw new TypeError('unicorn');
		})(),
		{
			instanceOf: TypeError,
			message: 'unicorn',
		},
	);
});

test.failing('dynamic import works', async t => {
	await t.notThrowsAsync(
		makeAsynchronous(async () => {
			await import('time-span');
		})(),
	);
});