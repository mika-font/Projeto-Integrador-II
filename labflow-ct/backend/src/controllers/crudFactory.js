const pool = require('../config/db');

function crud(table, idField, allowedFields) {
  return {
    async list(req, res) {
      const [rows] = await pool.query(`SELECT * FROM ${table} ORDER BY ${idField} DESC`);
      res.json(rows);
    },
    async get(req, res) {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [req.params.id]);
      if (!rows[0]) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.json(rows[0]);
    },
    async create(req, res) {
      const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
      if (!Object.keys(data).length) return res.status(400).json({ message: 'Nenhum campo válido informado.' });
      const [result] = await pool.query(`INSERT INTO ${table} SET ?`, data);
      res.status(201).json({ message: 'Registro criado com sucesso.', id: result.insertId });
    },
    async update(req, res) {
      const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowedFields.includes(key)));
      if (!Object.keys(data).length) return res.status(400).json({ message: 'Nenhum campo válido informado.' });
      const [result] = await pool.query(`UPDATE ${table} SET ? WHERE ${idField} = ?`, [data, req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.json({ message: 'Registro atualizado com sucesso.' });
    },
    async remove(req, res) {
      const [result] = await pool.query(`DELETE FROM ${table} WHERE ${idField} = ?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Registro não encontrado.' });
      res.json({ message: 'Registro excluído com sucesso.' });
    }
  };
}

module.exports = crud;
