const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function list(req, res) {
  const [rows] = await pool.query('SELECT idUser, nome, matricula, role, createdAt, updatedAt FROM usuarios ORDER BY idUser DESC');
  res.json(rows);
}

async function create(req, res) {
  const { nome, matricula, role = 'Docente', senha } = req.body;
  if (!nome || !matricula) return res.status(400).json({ message: 'Nome e matrícula são obrigatórios.' });
  const senhaHash = role === 'Porteiro' && senha ? await bcrypt.hash(senha, 10) : null;
  const [result] = await pool.query('INSERT INTO usuarios (nome, matricula, role, senhaHash) VALUES (?, ?, ?, ?)', [nome, matricula, role, senhaHash]);
  res.status(201).json({ message: 'Usuário criado com sucesso.', id: result.insertId });
}

async function update(req, res) {
  const { nome, matricula, role, senha } = req.body;
  const data = {};
  if (nome !== undefined) data.nome = nome;
  if (matricula !== undefined) data.matricula = matricula;
  if (role !== undefined) data.role = role;
  if (senha) data.senhaHash = await bcrypt.hash(senha, 10);
  if (!Object.keys(data).length) return res.status(400).json({ message: 'Nenhum campo válido informado.' });
  const [result] = await pool.query('UPDATE usuarios SET ? WHERE idUser = ?', [data, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Usuário não encontrado.' });
  res.json({ message: 'Usuário atualizado com sucesso.' });
}

async function remove(req, res) {
  const [result] = await pool.query('DELETE FROM usuarios WHERE idUser = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: 'Usuário não encontrado.' });
  res.json({ message: 'Usuário excluído com sucesso.' });
}

module.exports = { list, create, update, remove };
