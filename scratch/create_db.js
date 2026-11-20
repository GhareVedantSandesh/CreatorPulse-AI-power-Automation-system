import pg from 'pg';
const { Client } = pg;

async function createDb() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'nopass@1',
    });

    try {
        await client.connect();
        await client.query('CREATE DATABASE creatorpulse');
        console.log('Database creatorpulse created successfully');
    } catch (err) {
        if (err.code === '42P04') {
            console.log('Database creatorpulse already exists');
        } else {
            console.error('Error creating database:', err.message);
        }
    } finally {
        await client.end();
    }
}

createDb();
