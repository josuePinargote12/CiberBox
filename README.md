# CiberBox

Sistema local de laboratorio de caja negra con **un solo backend** en `backend/` y un dashboard en `frontend/`. El backend ejecuta el objetivo vulnerable, registra sus eventos en MySQL y expone el acceso protegido mediante JWT. El esquema unificado está en `database/schema.sql`.

> El Target tiene vulnerabilidades intencionales para ejercicios locales. Úsalo solo en tu máquina con datos ficticios; por defecto escucha en `127.0.0.1`.

## Requisitos

- Node.js 18 o superior
- pnpm (`npm install -g pnpm`)
- MySQL 8+

## Inicio en Windows

1. Inicia MySQL y ejecuta `database/schema.sql`.
2. Copia `backend/.env.example` como `backend/.env`. Ajusta los datos de conexión MySQL y cambia `JWT_SECRET` y `JWT_REFRESH_SECRET`. Puedes conservar la contraseña local de demostración del agente o reemplazarla; si la reemplazas, usa la nueva para iniciar sesión.
3. Desde la carpeta raíz ejecuta `pnpm install`.
4. Crea el usuario agente una vez con `pnpm seed`.
5. Levanta backend y dashboard con `pnpm dev`.
6. Abre <http://localhost:5173> e inicia sesión con las credenciales de agente configuradas en `backend/.env`.

Puedes iniciar solo el backend con `pnpm dev:backend` o solo el dashboard con `pnpm dev:frontend`.

## Usuarios y contraseñas de prueba

| Acceso | Usuario | Contraseña |
|---|---|---|
| Target de laboratorio (administrador) | `admin@test.com` | `admin123` |
| Target de laboratorio (usuario) | `user1@test.com` | `user123` |
| Dashboard / agente JWT | `agente-ia@ciberbox.local` | `CiberBoxAgent123!` |

Las dos cuentas del Target se insertan al ejecutar `database/schema.sql`. La cuenta del dashboard se crea con `pnpm seed` y los valores `AGENT_EMAIL` y `AGENT_PASSWORD` de `backend/.env`. Estas credenciales son únicamente para el laboratorio local; no las reutilices fuera de él.

## Carpetas

- `backend/`: servidor Express único, rutas de práctica, autenticación JWT, consultas del dashboard y registro de eventos.
- `frontend/`: dashboard React/Vite.
- `database/`: esquema SQL de la base unificada `ciberbox`.
- `docs/`: matriz de vulnerabilidades y plantilla de informe.

## Rutas

| Método y ruta | Función |
|---|---|
| `POST /api/target/auth/login` | Login vulnerable para practicar SQLi |
| `GET /api/target/users/:id` | Consulta vulnerable a IDOR |
| `POST /api/target/comments` | Almacena contenido para el ejercicio de XSS |
| `GET /api/target/comments` | Consulta comentarios |
| `POST /api/auth/login` | Login del agente, devuelve access JWT y cookie refresh |
| `POST /api/auth/refresh` | Renueva el access JWT |
| `POST /api/auth/logout` | Revoca la sesión refresh |
| `GET /api/attack-events` | Eventos recientes, requiere Bearer JWT |
| `GET /api/attack-summary` | Resumen por ruta y código HTTP, requiere Bearer JWT |
| `GET /health` | Estado del backend |

El backend registra las respuestas de `/api/target/*` en `eventos`; redacta el campo `password` antes de guardarlo. El dashboard presenta el contenido de comentarios como texto, sin ejecutarlo como HTML.
