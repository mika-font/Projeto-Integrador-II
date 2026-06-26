const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function login(req, res) {
  const { matricula, senha } = req.body;
  if (!matricula || !senha) return res.status(400).json({ message: 'Matrícula e senha são obrigatórias.' });

  const [rows] = await pool.query('SELECT * FROM usuarios WHERE matricula = ? AND role = "Porteiro" LIMIT 1', [matricula]);
  const usuario = rows[0];
  if (!usuario || !usuario.senhaHash) return res.status(401).json({ message: 'Credenciais inválidas.' });

  const ok = await bcrypt.compare(senha, usuario.senhaHash);
  if (!ok) return res.status(401).json({ message: 'Credenciais inválidas.' });

  const token = jwt.sign({ idUser: usuario.idUser, nome: usuario.nome, role: usuario.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, usuario: { idUser: usuario.idUser, nome: usuario.nome, matricula: usuario.matricula, role: usuario.role } });
}

module.exports = { login };
