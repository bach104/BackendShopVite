const express = require('express');
const router = express.Router();
const upload = require('../middleware/multerMiddleware');
const shipperController = require('../controllers/shipperController');
const { verifyShipper} = require('../middleware/authMiddleware');
router.post('/register', shipperController.register);

router.post('/login', shipperController.login);

router.put('/update', verifyShipper, upload, shipperController.updateInformation);

router.post('/logout', shipperController.logout);

module.exports = router;
