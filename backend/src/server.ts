import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ciberbox', connectionLimit: 10,
});
const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((value) => value.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

const accessSecret = process.env.JWT_SECRET || 'local-only-access-secret-change-me-32';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'local-only-refresh-secret-change-me-32';
const issueAccess = (id: number, rol: string) => jwt.sign({ id, rol }, accessSecret, { expiresIn: (process.env.JWT_EXPIRES || '15m') as SignOptions['expiresIn'] });
const issueRefresh = (id: number, rol: string) => jwt.sign({ id, rol }, refreshSecret, { expiresIn: (process.env.JWT_REFRESH_EXPIRES || '7d') as SignOptions['expiresIn'] });
const cookieOptions = { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/api/auth' };

app.get('/health', (_req, res) => res.json({ service: 'CiberBox Backend', status: 'ok' }));

// Logger integrado: registra las respuestas del objetivo en la misma base de datos.
app.use('/api/target', (req, res, next) => {
  res.on('finish', () => {
    const loggedBody = { ...(req.body || {}) };
    if ('password' in loggedBody) loggedBody.password = '[REDACTADO]';
    pool.query('INSERT INTO eventos (endpoint, metodo, body, status_code, ip, timestamp) VALUES (?, ?, ?, ?, ?, ?)', [
      req.originalUrl.slice(0, 255), req.method.slice(0, 10), JSON.stringify(loggedBody), res.statusCode,
      (req.ip || '').slice(0, 45) || null, new Date(),
    ]).catch((error) => console.error('No se pudo guardar el evento:', error.message));
  });
  next();
});

// TARGET: vulnerabilidades deliberadas para ejercicios en el laboratorio local.
// CB-01 SQL injection: la interpolación permite practicar una falla realista.
app.post('/api/target/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ message: 'Email y contraseña son requeridos' });
  try {
    const [rows] = await pool.query(`SELECT id, email, rol FROM usuarios WHERE email = '${email}' AND password = '${password}'`);
    const user = (rows as any[])[0];
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
    res.json({ message: 'Autenticación correcta', user });
  } catch { res.status(500).json({ message: 'Error en el servidor' }); }
});

// CB-02 IDOR: no verifica que el solicitante pueda acceder al identificador elegido.
app.get('/api/target/users/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, email, rol FROM usuarios WHERE id = ?', [req.params.id]);
    res.json((rows as any[])[0] || {});
  } catch { res.status(500).json({ message: 'Error en el servidor' }); }
});

// CB-03 XSS almacenado: conserva HTML sin sanitizar; el dashboard no lo renderiza como HTML.
app.post('/api/target/comments', async (req, res) => {
  const { usuario_id, contenido } = req.body || {};
  if (typeof contenido !== 'string' || !contenido.trim()) return res.status(400).json({ message: 'El contenido es requerido' });
  try {
    await pool.query('INSERT INTO comentarios (usuario_id, contenido) VALUES (?, ?)', [usuario_id || null, contenido]);
    res.status(201).json({ message: 'Comentario creado' });
  } catch { res.status(500).json({ message: 'Error en el servidor' }); }
});
app.get('/api/target/comments', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, usuario_id, contenido, created_at FROM comentarios ORDER BY id DESC');
    res.json(rows);
  } catch { res.status(500).json({ message: 'Error en el servidor' }); }
});

// BRIDGE: login con contraseña bcrypt, access JWT y refresh token en cookie HttpOnly.
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ message: 'Email y contraseña son requeridos' });
  try {
    const [rows] = await pool.query('SELECT id, email, password, rol FROM usuarios_bridge WHERE email = ?', [email]);
    const user = (rows as any[])[0];
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Credenciales inválidas' });
    const refreshToken = issueRefresh(user.id, user.rol);
    await pool.query('UPDATE usuarios_bridge SET refresh_token = ? WHERE id = ?', [await bcrypt.hash(refreshToken, 10), user.id]);
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ accessToken: issueAccess(user.id, user.rol), user: { email: user.email, rol: user.rol } });
  } catch { res.status(500).json({ message: 'Error en el servidor' }); }
});

app.post('/api/auth/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'Sesión no disponible' });
  try {
    const payload = jwt.verify(token, refreshSecret) as { id: number; rol: string };
    const [rows] = await pool.query('SELECT refresh_token FROM usuarios_bridge WHERE id = ?', [payload.id]);
    const stored = (rows as any[])[0]?.refresh_token;
    if (!stored || !(await bcrypt.compare(token, stored))) return res.status(403).json({ message: 'Sesión inválida' });
    res.json({ accessToken: issueAccess(payload.id, payload.rol) });
  } catch { res.status(403).json({ message: 'Sesión expirada o inválida' }); }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = jwt.verify(token, refreshSecret) as { id: number };
      await pool.query('UPDATE usuarios_bridge SET refresh_token = NULL WHERE id = ?', [payload.id]);
    } catch { /* Eliminar la cookie aunque haya expirado. */ }
  }
  res.clearCookie('refreshToken', cookieOptions);
  res.sendStatus(204);
});

function auth(req: Request, res: Response, next: NextFunction) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'No autorizado' });
  try { (req as any).user = jwt.verify(token, accessSecret); next(); }
  catch { res.status(401).json({ message: 'Token inválido o expirado' }); }
}

app.get('/api/attack-events', auth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 1000, 1), 1000);
  try {
    const [rows] = await pool.query('SELECT id, endpoint, metodo, body, status_code, ip, timestamp FROM eventos ORDER BY timestamp DESC LIMIT ?', [limit]);
    res.json({ sistema: 'CiberBox', total: (rows as any[]).length, eventos: rows });
  } catch { res.status(500).json({ message: 'No se pudieron consultar los eventos' }); }
});

app.get('/api/attack-summary', auth, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT endpoint, status_code, COUNT(*) AS cantidad FROM eventos GROUP BY endpoint, status_code');
    const porEndpoint: Record<string, number> = {};
    const codigosEstado: Record<string, number> = {};
    let totalIntentos = 0;
    for (const row of rows as any[]) {
      const count = Number(row.cantidad);
      porEndpoint[row.endpoint] = (porEndpoint[row.endpoint] || 0) + count;
      codigosEstado[String(row.status_code)] = (codigosEstado[String(row.status_code)] || 0) + count;
      totalIntentos += count;
    }
    res.json({ sistema: 'CiberBox', totalIntentos, porEndpoint, codigosEstado });
  } catch { res.status(500).json({ message: 'No se pudo generar el resumen' }); }
});

const port = Number(process.env.PORT || 4000);
app.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`CiberBox Backend: http://127.0.0.1:${port}`));
