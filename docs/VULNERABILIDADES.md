# Matriz de vulnerabilidades del laboratorio

Este documento describe fallas intencionales en las rutas Target del backend único, accesible solo en `127.0.0.1:4000` por defecto. CVSS es una referencia inicial: la puntuación depende del contexto y debe confirmarse en el informe de cada ejercicio.

| ID | Hallazgo | Ruta | CVSS v3.1 orientativo | Impacto |
|---|---|---|---|---|
| CB-01 | Inyección SQL en autenticación | `POST /api/target/auth/login` | 9.8 Crítico | El SQL concatena los campos de login y permite alterar la consulta. |
| CB-02 | Referencia directa insegura (IDOR) | `GET /api/target/users/:id` | 6.5 Medio | Se consulta información de cualquier usuario sin verificar autorización. |
| CB-03 | XSS almacenado potencial | `POST /api/target/comments` y `GET /api/target/comments` | 6.1 Medio | Se almacena HTML sin sanitizar. La API devuelve el contenido; un cliente que lo renderice como HTML puede ejecutarlo. |

Los valores CVSS son orientativos, no un análisis formal. Utiliza únicamente los usuarios semilla ficticios (`admin@test.com` / `admin123`; `user1@test.com` / `user123`). El dashboard presenta comentarios como texto y no ejecuta su contenido.
