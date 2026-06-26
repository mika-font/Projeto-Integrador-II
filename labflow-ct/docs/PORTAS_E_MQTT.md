# LabFlow-CT — Portas, MQTT e servidor

## Portas de comunicação

| Serviço | Porta padrão | Uso |
|---|---:|---|
| React/Vite em desenvolvimento | 5173 | Interface web local |
| Backend Node.js/Express | 3001 | API REST e WebSocket |
| MySQL | 3306 | Banco de dados |
| MQTT sem TLS | 1883 | Comunicação ESP32 ↔ servidor |
| MQTT com TLS | 8883 | MQTT seguro em produção |
| HTTP | 80 | Acesso público via Nginx |
| HTTPS | 443 | Acesso público seguro via Nginx |

## Tópicos MQTT sugeridos

Use `deviceId` como MAC address sem caracteres especiais ou um ID cadastrado no sistema.

### Pedido de acesso por cartão
ESP32 publica:

```json
Topic: labflow/{deviceId}/access/request
{
  "tokenAuth": "TOKEN_DO_DISPOSITIVO",
  "uid": "E6:97:A7:1A",
  "evento": "RFID_EXTERNO"
}
```

Servidor responde:

```json
Topic: labflow/{deviceId}/access/response
{
  "authorized": true,
  "reason": "PERMISSAO_VALIDA"
}
```

### Evento simples do dispositivo

```json
Topic: labflow/{deviceId}/event
{
  "tokenAuth": "TOKEN_DO_DISPOSITIVO",
  "evento": "BOTAO_EXTERNO_ATIVADO",
  "detalhe": "Modo livre ativado pelo leitor interno"
}
```

Eventos recomendados:

- `RFID_EXTERNO`
- `RFID_INTERNO`
- `BOTAO_EXTERNO`
- `BOTAO_INTERNO`
- `BOTAO_EXTERNO_ATIVADO`
- `BOTAO_EXTERNO_DESATIVADO`
- `STATUS`

### Checagem de firmware

```json
Topic: labflow/{deviceId}/firmware/check
{
  "tokenAuth": "TOKEN_DO_DISPOSITIVO",
  "firmwareAtual": "1.0.0"
}
```

Servidor responde:

```json
Topic: labflow/{deviceId}/firmware/response
{
  "update": true,
  "version": "1.1.0",
  "url": "https://servidor/firmware/labflow-1.1.0.bin",
  "obrigatorio": false
}
```

A regra implementada só libera atualização de firmware entre 00:00 e 06:59, evitando o período de aulas entre 7h e 23h.

## Subida no servidor

1. Instalar Node.js LTS, MySQL, Mosquitto e Nginx.
2. Criar o banco com `database/schema.sql`.
3. Criar usuário MySQL próprio para o projeto.
4. Copiar `backend/.env.example` para `backend/.env` e configurar credenciais.
5. Rodar backend com PM2 ou systemd.
6. Rodar `npm run build` no frontend e servir a pasta `dist` pelo Nginx.
7. Em produção, usar HTTPS na interface e MQTT com autenticação. Se possível, usar MQTT TLS na porta 8883.

## Comandos base Ubuntu Server

```bash
sudo apt update
sudo apt install -y mysql-server mosquitto mosquitto-clients nginx
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

```bash
mysql -u root -p < database/schema.sql
```

```bash
cd backend
cp .env.example .env
npm install
npm run start
```

```bash
cd frontend
cp .env.example .env
npm install
npm run build
```
