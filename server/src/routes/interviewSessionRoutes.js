const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const controller = require('../controllers/interviewSessionController');

const router = express.Router();
router.use(authenticateToken);
router.post('/', controller.createSession);
router.get('/', controller.listSessions);
router.get('/:id', controller.getSession);
router.patch('/:id', controller.updateSession);
router.delete('/:id', controller.deleteSession);
module.exports = router;
