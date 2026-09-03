const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const plantController = require('../controllers/plantController');
const { requireAdmin } = require('../middlewares/authMiddleware');

// 案例清單 (公開)
router.get('/cases', caseController.getAllCases);

// 管理員操作案例 (需密碼保護)
router.post('/cases', requireAdmin, caseController.saveCase);
router.delete('/cases/:id', requireAdmin, caseController.deleteCase);

// 管理員操作植物標記 (需密碼保護)
router.post('/plants', requireAdmin, plantController.savePlant);
router.delete('/plants/:id', requireAdmin, plantController.deletePlant);

module.exports = router;