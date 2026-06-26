const pool = require('../config/db');

async function list(req, res) {
  const [rows] = await pool.query(`
    SELECT p.*, u.nome, u.matricula, l.predio, l.sala
    FROM permissoes p
    JOIN usuarios u ON u.idUser = p.idUser
    JOIN laboratorios l ON l.idLab = p.idLab
    ORDER BY p.idAcess DESC
  `);
  res.json(rows);
}

async function create(req, res) {
  const { idUser, idLab, data_inic, data_fim } = req.body;
  if (!idUser || !idLab || !data_inic || !data_fim) {
    return res.status(400).json({ message: 'idUser, idLab, data_inic e data_fim são obrigatórios.' });
  }
  const [result] = await pool.query(
    'INSERT INTO permissoes (idUser, idLab, data_inic, data_fim) VALUES (?, ?, ?, ?)',
    [idUser, idLab, data_inic, data_fim]
  );
  res.status(201).json({ message: 'Permissão atribuída com sucesso.', id: result.insertId });
}

async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM permissoes WHERE idAcess = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Permissão não encontrada.' });
  res.json({ message: 'Permissão removida com sucesso.' });
}

module.exports = { list, create, remove };
