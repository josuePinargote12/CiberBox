CREATE DATABASE IF NOT EXISTS ciberbox CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ciberbox;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(30) DEFAULT 'user'
);
CREATE TABLE IF NOT EXISTS comentarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NULL,
  contenido TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comentarios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS eventos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  metodo VARCHAR(10) NOT NULL,
  body JSON NULL,
  status_code SMALLINT NOT NULL,
  ip VARCHAR(45) NULL,
  timestamp DATETIME(3) NOT NULL,
  INDEX idx_eventos_timestamp (timestamp),
  INDEX idx_eventos_endpoint (endpoint)
);
CREATE TABLE IF NOT EXISTS usuarios_bridge (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(30) DEFAULT 'agente',
  refresh_token VARCHAR(255) NULL
);

INSERT IGNORE INTO usuarios (id, email, password, rol) VALUES
  (1, 'admin@test.com', 'admin123', 'admin'),
  (2, 'user1@test.com', 'user123', 'user');
