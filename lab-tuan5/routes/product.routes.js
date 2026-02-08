const express = require('express');
const router = express.Router();
const ProductController = require('../controllers/product.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);
router.get('/', ProductController.index);
router.get('/add', ProductController.showAddForm);
router.post('/add', ProductController.create);
router.get('/edit/:id', ProductController.showEditForm);
router.post('/edit/:id', ProductController.update);
router.post('/delete/:id', ProductController.delete);

module.exports = router;

