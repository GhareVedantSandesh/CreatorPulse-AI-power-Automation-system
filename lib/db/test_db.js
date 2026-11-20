import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgres://postgres:nopass%401@localhost:5432/creatorpulse',
});

async function test() {
  try {
    await client.connect();
    console.log('Successfully connected to Postgres database: creatorpulse');
    const res = await client.query('SELECT NOW()');
    console.log('Current time in DB:', res.rows[0].now);
    await client.end();
  } catch (err) {
    console.error('Failed to connect to the database:', err.message);
  }
}

test();
