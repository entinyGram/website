import { sql } from './db';

export interface DonationRow {
	id: number;
	amount: number;
	sender: string;
	comment: string;
	created_at: string;
}

export interface IncomingDonation {
	id: string;
	amount: number;
	balance: number;
	sender?: string;
	comment?: string;
}

/** Amount/balance are kopecks, straight off the monobank webhook. Returns true on new insert, false on update (duplicate tx id). */
export async function recordDonation(tx: IncomingDonation): Promise<boolean> {
	const existing = await sql`SELECT 1 FROM jar_donations WHERE mono_tx_id = ${tx.id}`;
	await sql`
		INSERT INTO jar_donations (mono_tx_id, amount, balance, sender, comment)
		VALUES (${tx.id}, ${tx.amount}, ${tx.balance}, ${tx.sender || ''}, ${tx.comment || ''})
		ON CONFLICT (mono_tx_id) DO UPDATE
			SET sender  = EXCLUDED.sender,
			    comment = EXCLUDED.comment,
			    balance = EXCLUDED.balance
	`;
	return existing.length === 0;
}

// The table may not exist yet on a fresh deploy with zero donations so far - the donate
// page must render fine either way, not 500.
export async function getRecentDonations(limit = 10): Promise<DonationRow[]> {
	try {
		return await sql<DonationRow[]>`
			SELECT id, amount, sender, comment, created_at
			FROM jar_donations
			ORDER BY created_at DESC
			LIMIT ${limit}
		`;
	} catch (err) {
		console.error('[donations] getRecentDonations failed', err);
		return [];
	}
}

export async function getLatestBalance(): Promise<number | null> {
	try {
		const rows = await sql<{ balance: number }[]>`
			SELECT balance FROM jar_donations ORDER BY created_at DESC LIMIT 1
		`;
		return rows[0]?.balance ?? null;
	} catch (err) {
		console.error('[donations] getLatestBalance failed', err);
		return null;
	}
}
