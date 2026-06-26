const pool = require('../config/db');
const socket = require('../config/socket');

async function findDeviceByToken(tokenAuth) {
  const [rows] = await pool.query(`
    SELECT d.*, l.idLab, l.predio, l.sala
    FROM dispositivos d
    JOIN laboratorios l ON l.idLab = d.idLab
    WHERE d.tokenAuth = ?
    LIMIT 1
  `, [tokenAuth]);
  return rows[0];
}

async function verifyCardAccess({ tokenAuth, uid, evento = 'RFID_EXTERNO' }) {
  const device = await findDeviceByToken(tokenAuth);
  if (!device) return { authorized: false, reason: 'DISPOSITIVO_INVALIDO' };

  await pool.query('UPDATE dispositivos SET status = "ONLINE", lastSeen = NOW() WHERE idDisp = ?', [device.idDisp]);

  const [cards] = await pool.query('SELECT * FROM cartoes WHERE idHex = ? AND status = TRUE LIMIT 1', [uid]);
  const card = cards[0];

  let authorized = false;
  let reason = 'CARTAO_INVALIDO';

  if (card) {
    const [userRows] = await pool.query('SELECT * FROM usuarios WHERE idUser = ? LIMIT 1', [card.idUser]);
    const user = userRows[0];
    if (user?.role === 'Porteiro' || user?.role === 'Servidor') {
      authorized = true;
      reason = 'ACESSO_TOTAL';
    } else {
      const [perms] = await pool.query(`
        SELECT * FROM permissoes
        WHERE idUser = ? AND idLab = ? AND CURDATE() BETWEEN data_inic AND data_fim
        LIMIT 1
      `, [card.idUser, device.idLab]);
      authorized = perms.length > 0;
      reason = authorized ? 'PERMISSAO_VALIDA' : 'SEM_PERMISSAO';
    }
  }

  await pool.query(
    'INSERT INTO log_acesso (idLab, idCartao, idDisp, evento, detalhe, autorizado) VALUES (?, ?, ?, ?, ?, ?)',
    [device.idLab, card?.idCartao || null, device.idDisp, evento, reason, authorized]
  );

  socket.emit('access:new', { uid, idLab: device.idLab, laboratorio: `${device.predio} - ${device.sala}`, evento, authorized, reason, timestamp: new Date().toISOString() });
  return { authorized, reason, lab: { idLab: device.idLab, predio: device.predio, sala: device.sala } };
}

async function saveDeviceEvent({ tokenAuth, evento, detalhe }) {
  const device = await findDeviceByToken(tokenAuth);
  if (!device) return { ok: false, reason: 'DISPOSITIVO_INVALIDO' };
  await pool.query('UPDATE dispositivos SET status = "ONLINE", lastSeen = NOW() WHERE idDisp = ?', [device.idDisp]);
  await pool.query(
    'INSERT INTO log_acesso (idLab, idDisp, evento, detalhe, autorizado) VALUES (?, ?, ?, ?, ?)',
    [device.idLab, device.idDisp, evento, detalhe || null, true]
  );
  socket.emit('access:new', { idLab: device.idLab, laboratorio: `${device.predio} - ${device.sala}`, evento, detalhe, authorized: true, timestamp: new Date().toISOString() });
  return { ok: true };
}

module.exports = { verifyCardAccess, saveDeviceEvent, findDeviceByToken };
