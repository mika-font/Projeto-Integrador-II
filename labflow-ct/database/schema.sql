CREATE DATABASE IF NOT EXISTS labflow_ct
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE labflow_ct;

CREATE TABLE usuarios (
  idUser INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  matricula VARCHAR(100) NOT NULL UNIQUE,
  role ENUM('Porteiro', 'Docente', 'Servidor', 'Discente') NOT NULL DEFAULT 'Docente',
  senhaHash VARCHAR(255) NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE cartoes (
  idCartao INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NULL UNIQUE,
  idHex VARCHAR(50) NOT NULL UNIQUE,
  status BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cartao_usuario
    FOREIGN KEY (idUser) REFERENCES usuarios(idUser)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE laboratorios (
  idLab INT AUTO_INCREMENT PRIMARY KEY,
  predio VARCHAR(50) NOT NULL,
  sala VARCHAR(50) NOT NULL,
  status ENUM('Aberto', 'Fechado') NOT NULL DEFAULT 'Fechado',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_lab_predio_sala (predio, sala)
);

CREATE TABLE firmware (
  idFirm INT AUTO_INCREMENT PRIMARY KEY,
  data_upload DATE NOT NULL,
  versao VARCHAR(50) NOT NULL UNIQUE,
  url VARCHAR(500) NOT NULL,
  obrigatorio BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dispositivos (
  idDisp INT AUTO_INCREMENT PRIMARY KEY,
  idLab INT NULL UNIQUE,
  idFirm INT NULL,
  macAddress VARCHAR(100) NOT NULL UNIQUE,
  tokenAuth VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'OFFLINE',
  firmwareAtual VARCHAR(50) NULL,
  lastSeen DATETIME NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dispositivo_lab
    FOREIGN KEY (idLab) REFERENCES laboratorios(idLab)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_dispositivo_firmware
    FOREIGN KEY (idFirm) REFERENCES firmware(idFirm)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE permissoes (
  idAcess INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  idLab INT NOT NULL,
  data_inic DATE NOT NULL,
  data_fim DATE NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_permissao_usuario
    FOREIGN KEY (idUser) REFERENCES usuarios(idUser)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_permissao_lab
    FOREIGN KEY (idLab) REFERENCES laboratorios(idLab)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT chk_datas_permissao CHECK (data_fim >= data_inic),
  UNIQUE KEY uk_permissao_periodo (idUser, idLab, data_inic, data_fim)
);

CREATE TABLE log_acesso (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idLab INT NOT NULL,
  idCartao INT NULL,
  idDisp INT NULL,
  timeStamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  evento VARCHAR(50) NOT NULL,
  detalhe VARCHAR(255) NULL,
  autorizado BOOLEAN NULL,
  CONSTRAINT fk_log_lab
    FOREIGN KEY (idLab) REFERENCES laboratorios(idLab)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_log_cartao
    FOREIGN KEY (idCartao) REFERENCES cartoes(idCartao)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_log_dispositivo
    FOREIGN KEY (idDisp) REFERENCES dispositivos(idDisp)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_log_timestamp (timeStamp),
  INDEX idx_log_evento (evento)
);

INSERT INTO usuarios (nome, matricula, role, senhaHash) VALUES
('Porteiro Administrador', 'admin', 'Porteiro', '$2b$10$0SPoEq0qzAwx5XmoMzVGTeD4bMzS3sczWgDsJp9u7Bo3D55zi3O66');
-- Senha inicial do usuário admin: admin123
-- Troque a senha em produção.
