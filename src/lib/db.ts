import { createClient, type InValue } from '@libsql/client';

const url = import.meta.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL;
const authToken = import.meta.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (!url) {
	throw new Error('TURSO_DATABASE_URL is not set. Add it to your .env file (file:local.db works for dev).');
}

const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof createClient> };
const client = globalForDb.__db ?? createClient({ url, authToken });
globalForDb.__db = client;

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

function toArg(v: unknown): InValue {
	if (v === undefined || v === null) return null;
	if (typeof v === 'boolean') return v ? 1 : 0;
	if (v instanceof Date) return v.toISOString();
	if (Array.isArray(v)) return JSON.stringify(v);
	return v as InValue;
}

/** SQL text plus bound args. Awaiting it runs the query; interpolating it into another query inlines it. */
export class Query<T = Record<string, any>[]> implements PromiseLike<T> {
	constructor(readonly text: string, readonly args: InValue[]) {}

	then<R1 = T, R2 = never>(
		onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
		onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
	): Promise<R1 | R2> {
		return this.run().then(onfulfilled, onrejected);
	}

	private async run(): Promise<T> {
		const res = await client.execute({ sql: this.text.replace(/\bnow\(\)/gi, NOW), args: this.args });
		return res.rows.map((row) =>
			Object.fromEntries(res.columns.map((col, i) => [col, row[i]])),
		) as unknown as T;
	}
}

function build(strings: readonly string[], values: unknown[]): Query<any> {
	let text = strings[0];
	const args: InValue[] = [];
	values.forEach((v, i) => {
		if (v instanceof Query) {
			text += v.text;
			args.push(...v.args);
		} else {
			text += '?';
			args.push(toArg(v));
		}
		text += strings[i + 1];
	});
	return new Query(text, args);
}

export const sql = Object.assign(
	<T = Record<string, any>[]>(strings: TemplateStringsArray, ...values: unknown[]) =>
		build(strings, values) as Query<T>,
	{
		/** Raw SQL with no parameters. Never pass user input. */
		unsafe: (text: string) => new Query(text, []),
		/** `?, ?, ?` for an IN (...) clause. */
		list: (items: unknown[]) => new Query(items.map(() => '?').join(', '), items.map(toArg)),
	},
);
