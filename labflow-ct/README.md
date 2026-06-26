# LabFlow-CT

Software inicial para gerenciamento de cartões, usuários, laboratórios, dispositivos ESP32, permissões, firmware e logs de acesso.

## Stack

- Frontend: React + Vite + Recharts + Socket.IO Client
- Backend: Node.js + Express + MySQL + MQTT + Socket.IO
- Banco: MySQL
- Comunicação ESP32: MQTT

## Estrutura

```text
labflow-ct/
  backend/
  frontend/
  database/schema.sql
  docs/PORTAS_E_MQTT.md
```

## Login inicial

- Matrícula: `admin`
- Senha: `admin123`

Troque essa senha antes de usar em produção.

## Rodar localmente

### Banco

```bash
mysql -u root -p < database/schema.sql
```

Crie um usuário no MySQL, por exemplo:

```sql
CREATE USER 'labflow_user'@'localhost' IDENTIFIED BY 'labflow_pass';
GRANT ALL PRIVILEGES ON labflow_ct.* TO 'labflow_user'@'localhost';
FLUSH PRIVILEGES;
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### MQTT local

Instale e rode Mosquitto. No Ubuntu:

```bash
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable --now mosquitto
```

## Próximo passo recomendado

Este pacote é um MVP funcional. Para entrega final, recomenda-se complementar as telas de CRUD com formulários completos, validações de campos, upload real dos arquivos `.bin` de firmware e configuração de HTTPS/MQTT TLS.
