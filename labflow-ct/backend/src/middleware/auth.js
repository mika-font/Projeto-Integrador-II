const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token não informado.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido.' });
  }
}

function onlyPorteiro(req, res, next) {
  if (req.user?.role !== 'Porteiro') {
    return res.status(403).json({ message: 'Acesso restrito ao Porteiro.' });
  }
  next();
}

module.exports = { auth, onlyPorteiro };
