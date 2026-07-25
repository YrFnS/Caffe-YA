import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { Client } from 'pg'

const connectionString = process.env.TEST_DATABASE_URL

test('Neon transaction rollback leaves purchase, receipt, stock, and journal unchanged', { skip: !connectionString }, async () => {
  const client = new Client({ connectionString })
  await client.connect()
  const purchaseId = randomUUID()
  try {
    const { rows: [ingredient] } = await client.query<{ id: string; stock_qty: string }>('select id, stock_qty from ingredients limit 1')
    const { rows: [user] } = await client.query<{ id: string }>('select id from users limit 1')
    const { rows: accounts } = await client.query<{ id: string; code: string }>("select id, code from chart_of_accounts where code in ('1201','2001')")
    assert.ok(ingredient && user && accounts.length === 2)

    await client.query('begin')
    await client.query('insert into purchases (id, total_amount, created_by, note) values ($1, $2, $3, $4)', [purchaseId, '10.000', user.id, `e2e-${purchaseId}`])
    await client.query('insert into purchase_items (purchase_id, ingredient_id, quantity, unit_cost, total_cost) values ($1, $2, $3, $4, $5)', [purchaseId, ingredient.id, '2', '5', '10'])
    const { rows: [receipt] } = await client.query<{ id: string }>('insert into goods_receipts (purchase_id, received_by) values ($1, $2) returning id', [purchaseId, user.id])
    await client.query('insert into goods_receipt_items (goods_receipt_id, ingredient_id, quantity, unit_cost) values ($1, $2, $3, $4)', [receipt.id, ingredient.id, '2', '5'])
    await client.query('update ingredients set stock_qty = stock_qty + 2 where id = $1', [ingredient.id])
    const { rows: [journal] } = await client.query<{ id: string }>("insert into journal_entries (source_type, source_id, created_by) values ('purchase', $1, $2) returning id", [purchaseId, user.id])
    await client.query("insert into journal_entry_lines (journal_entry_id, account_id, type, amount) values ($1,$2,'debit',$4),($1,$3,'credit',$4)", [journal.id, accounts[0].id, accounts[1].id, '10'])
    await client.query('rollback')

    assert.equal((await client.query('select 1 from purchases where id = $1', [purchaseId])).rowCount, 0)
    assert.equal((await client.query<{ stock_qty: string }>('select stock_qty from ingredients where id = $1', [ingredient.id])).rows[0].stock_qty, ingredient.stock_qty)
    assert.equal((await client.query('select 1 from journal_entries where source_id = $1', [purchaseId])).rowCount, 0)
  } finally {
    await client.query('rollback').catch(() => undefined)
    await client.end()
  }
})

test('Neon enforces one goods receipt per purchase and all journals balance', { skip: !connectionString }, async () => {
  const client = new Client({ connectionString })
  await client.connect()
  const purchaseId = randomUUID()
  try {
    const { rows: [user] } = await client.query<{ id: string }>('select id from users limit 1')
    assert.ok(user)
    await client.query('begin')
    await client.query('insert into purchases (id, total_amount, created_by) values ($1, $2, $3)', [purchaseId, '1', user.id])
    await client.query('insert into goods_receipts (purchase_id, received_by) values ($1, $2)', [purchaseId, user.id])
    let duplicateCode = ''
    try {
      await client.query('insert into goods_receipts (purchase_id, received_by) values ($1, $2)', [purchaseId, user.id])
    } catch (error) {
      duplicateCode = (error as { code?: string }).code ?? ''
    }
    assert.equal(duplicateCode, '23505')
    await client.query('rollback')

    const { rows } = await client.query(`
      select journal_entry_id
      from journal_entry_lines
      group by journal_entry_id
      having sum(case when type = 'debit' then amount else -amount end) <> 0
    `)
    assert.deepEqual(rows, [])
  } finally {
    await client.query('rollback').catch(() => undefined)
    await client.end()
  }
})
