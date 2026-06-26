const pool = require('../config/db');

function isMaintenanceWindow(date = new Date()) {
  const hour = date.getHours();
  return hour >= 0 && hour < 7; // madrugada: 00:00 até 06:59. Evita 7h às 23h.
}

async function checkFirmware({ tokenAuth, firmwareAtual }) {
  const [devices] = await pool.query('SELECT * FROM dispositivos WHERE tokenAuth = ? LIMIT 1', [tokenAuth]);
  const device = devices[0];
  if (!device) return { update: false, reason: 'DISPOSITIVO_INVALIDO' };

  await pool.query('UPDATE dispositivos SET firmwareAtual = ?, status = "ONLINE", lastSeen = NOW() WHERE idDisp = ?', [firmwareAtual || null, device.idDisp]);

  if (!isMaintenanceWindow()) {
    return { update: false, reason: 'FORA_DA_MADRUGADA' };
  }

  const [rows] = await pool.query('SELECT * FROM firmware ORDER BY data_upload DESC, idFirm DESC LIMIT 1');
  const latest = rows[0];
  if (!latest || latest.versao === firmwareAtual) return { update: false, reason: 'SEM_ATUALIZACAO' };

  return { update: true, version: latest.versao, url: latest.url, obrigatorio: !!latest.obrigatorio };
}

module.exports = { checkFirmware, isMaintenanceWindow };
