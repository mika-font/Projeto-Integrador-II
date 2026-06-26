const pool = require('../config/db');

async function summary(req, res) {
  const [[labs]] = await pool.query('SELECT COUNT(*) total FROM laboratorios');
  const [[cards]] = await pool.query('SELECT COUNT(*) total FROM cartoes WHERE status = TRUE');
  const [[logsToday]] = await pool.query('SELECT COUNT(*) total FROM log_acesso WHERE DATE(timeStamp) = CURDATE()');
  const [statusLabs] = await pool.query('SELECT status, COUNT(*) total FROM laboratorios GROUP BY status');
  const [accessByLab] = await pool.query(`
    SELECT CONCAT(l.predio, ' - ', l.sala) laboratorio, COUNT(la.id) total
    FROM laboratorios l
    LEFT JOIN log_acesso la ON la.idLab = l.idLab
    GROUP BY l.idLab
    ORDER BY total DESC
  `);
  const [lastLogs] = await pool.query(`
    SELECT la.*, l.predio, l.sala, c.idHex
    FROM log_acesso la
    JOIN laboratorios l ON l.idLab = la.idLab
    LEFT JOIN cartoes c ON c.idCartao = la.idCartao
    ORDER BY la.timeStamp DESC
    LIMIT 20
  `);
  res.json({ labs: labs.total, cards: cards.total, logsToday: logsToday.total, statusLabs, accessByLab, lastLogs });
}

module.exports = { summary };
