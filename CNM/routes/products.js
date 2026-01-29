const express = require('express');
const router = express.Router();
const ProductService = require('../services/ProductService');
const { requireLogin, requireAdmin, requireStaff, auditLog } = require('../middlewares/auth');

const productService = new ProductService();

router.use(auditLog);

/**
 * GET /api/products
 * Lấy tất cả products (public)
 * 
 * Query params:
 * - limit: số lượng items (default 20)
 * - lastKey: pagination key
 */
router.get('/', async (req, res) => {
  try {
    const { limit, lastKey } = req.query;
    const result = await productService.getAllProducts(
      parseInt(limit) || 20,
      lastKey ? JSON.parse(lastKey) : null
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/products/search
 * Tìm kiếm & lọc products
 * 
 * Query params:
 * - categoryId: UUID
 * - minPrice: số
 * - maxPrice: số
 * - name: chuỗi tìm kiếm
 * - limit: số lượng
 * - lastKey: pagination
 * 
 * ⚠️ Lưu ý DynamoDB:
 * - Sử dụng Query nếu có GSI (hiệu quả)
 * - Sử dụng Scan + Filter (tốn RCU)
 * - Tìm theo name phải dùng Scan vì không có full-text search
 */
router.get('/search', async (req, res) => {
  try {
    const { categoryId, minPrice, maxPrice, name, limit, lastKey } = req.query;

    const criteria = {
      categoryId: categoryId || undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      name: name || undefined,
      limit: parseInt(limit) || 20,
      lastKey: lastKey ? JSON.parse(lastKey) : null
    };

    const result = await productService.searchProducts(criteria);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/products/:id
 * Lấy product theo ID (public)
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ product });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

/**
 * POST /api/products
 * Tạo product mới (admin only)
 * 
 * Body:
 * {
 *   "name": "Laptop",
 *   "price": 999.99,
 *   "quantity": 10,
 *   "categoryId": "category-uuid",
 *   "imageUrl": "https://s3.../image.jpg"
 * }
 */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, price, quantity, categoryId, imageUrl } = req.body;
    const product = await productService.createProduct(
      name,
      price,
      quantity,
      categoryId,
      imageUrl
    );
    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * PUT /api/products/:id
 * Cập nhật product (admin only)
 */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const updateData = req.body;
    const product = await productService.updateProduct(req.params.id, updateData);
    res.json({ message: 'Product updated', product });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * DELETE /api/products/:id
 * Xóa product - SOFT DELETE (admin only)
 * 
 * Lưu ý: Không thực sự xóa, chỉ đánh dấu isDeleted = true
 * Xóa ảnh từ S3 nếu có
 * Ghi log DELETE
 */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await productService.deleteProduct(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * GET /api/products/inventory/status
 * Lấy tổng hàng tồn kho
 */
router.get('/inventory/status', async (req, res) => {
  try {
    const inventory = await productService.getTotalInventory();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
