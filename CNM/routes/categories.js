const express = require('express');
const router = express.Router();
const CategoryService = require('../services/CategoryService');
const { requireLogin, requireAdmin, auditLog } = require('../middlewares/auth');

const categoryService = new CategoryService();

router.use(auditLog);

/**
 * GET /api/categories
 * Lấy tất cả categories (public)
 */
router.get('/', async (req, res) => {
  try {
    const categories = await categoryService.getAllCategories();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/categories/:id
 * Lấy category theo ID (public)
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    res.json({ category });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

/**
 * POST /api/categories
 * Tạo category mới (admin only)
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await categoryService.createCategory(name, description);
    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * PUT /api/categories/:id
 * Cập nhật category (admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await categoryService.updateCategory(req.params.id, name, description);
    res.json({ message: 'Category updated', category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * DELETE /api/categories/:id
 * Xóa category (admin only)
 * 
 * Business rule: Không xóa nếu category có sản phẩm
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await categoryService.deleteCategory(req.params.id);
    res.json(result);
  } catch (error) {
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
