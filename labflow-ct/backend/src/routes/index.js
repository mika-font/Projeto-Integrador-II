const express = require('express');
const authController = require('../controllers/authController');
const usuariosController = require('../controllers/usuariosController');
const crud = require('../controllers/crudFactory');
const permissoesController = require('../controllers/permissoesController');
const dashboardController = require('../controllers/dashboardController');
const { auth, onlyPorteiro } = require('../middleware/auth');

const router = express.Router();
router.post('/auth/login', authController.login);

router.use(auth, onlyPorteiro);

router.get('/dashboard', dashboardController.summary);

router.get('/usuarios', usuariosController.list);
router.post('/usuarios', usuariosController.create);
router.put('/usuarios/:id', usuariosController.update);
router.delete('/usuarios/:id', usuariosController.remove);

const cartoes = crud('cartoes', 'idCartao', ['idUser', 'idHex', 'status']);
router.get('/cartoes', cartoes.list);
router.get('/cartoes/:id', cartoes.get);
router.post('/cartoes', cartoes.create);
router.put('/cartoes/:id', cartoes.update);
router.delete('/cartoes/:id', cartoes.remove);

const labs = crud('laboratorios', 'idLab', ['predio', 'sala', 'status']);
router.get('/laboratorios', labs.list);
router.get('/laboratorios/:id', labs.get);
router.post('/laboratorios', labs.create);
router.put('/laboratorios/:id', labs.update);
router.delete('/laboratorios/:id', labs.remove);

const dispositivos = crud('dispositivos', 'idDisp', ['idLab', 'idFirm', 'macAddress', 'tokenAuth', 'status', 'firmwareAtual']);
router.get('/dispositivos', dispositivos.list);
router.get('/dispositivos/:id', dispositivos.get);
router.post('/dispositivos', dispositivos.create);
router.put('/dispositivos/:id', dispositivos.update);
router.delete('/dispositivos/:id', dispositivos.remove);

const firmware = crud('firmware', 'idFirm', ['data_upload', 'versao', 'url', 'obrigatorio']);
router.get('/firmware', firmware.list);
router.get('/firmware/:id', firmware.get);
router.post('/firmware', firmware.create);
router.put('/firmware/:id', firmware.update);
router.delete('/firmware/:id', firmware.remove);

router.get('/permissoes', permissoesController.list);
router.post('/permissoes', permissoesController.create);
router.delete('/permissoes/:id', permissoesController.remove);

module.exports = router;
