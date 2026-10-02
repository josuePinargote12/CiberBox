import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

async function seed() {
  const email = process.env.AGENT_EMAIL;
  const password = process.env.AGENT_PASSWORD;
  if (!email || !password || password === 'change-this-local-password') {
    throw new Error('Configura AGENT_EMAIL y una AGENT_PASSWORD propia en backend/.env antes del seed.');
  }
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ciberbox',
  });
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query('INSERT INTO usuarios_bridge (email, password, rol) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password = VALUES(password), rol = VALUES(rol)', [email, hash, 'agente']);
    console.log(`Usuario agente preparado: ${email}`);
  } finally { await pool.end(); }
}

seed().catch((error) => { console.error(error.message); process.exitCode = 1; });
