import { Client } from 'pg';

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'dallasurbanists2025',
    port: 5432,
});

client.connect().then(() => {
  console.log('connected');
  client.end();
});