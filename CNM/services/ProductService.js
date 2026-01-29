const ProductRepository = require('../repositories/ProductRepository');
const CategoryRepository = require('../repositories/CategoryRepository');

class ProductService {
  constructor() {
    this.productRepo = new ProductRepository();
    this.categoryRepo = new CategoryRepository();
  }

  /**
   * Tạo product mới (chỉ admin)
   */
  async createProduct(name, price, quantity, categoryId, imageUrl = null) {
    // Validate dữ liệu
    if (!name || !price || quantity === undefined || !categoryId) {
      throw new Error('Missing required fields');
    }

    if (price < 0 || quantity < 0) {
      throw new Error('Price and quantity must be >= 0');
    }

    // Kiểm tra category tồn tại
    const category = await this.categoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    const product = await this.productRepo.createProduct(name, price, quantity, categoryId, imageUrl);
    return this._enrichProductWithCategory(product);
  }

  /**
   * Lấy tất cả products (pagination)
   */
  async getAllProducts(limit = 20, lastKey = null) {
    const result = await this.productRepo.getAllProducts(limit, lastKey);
    return {
      items: result.items.map(p => this._enrichProductWithDetails(p)),
      lastKey: result.lastKey
    };
  }

  /**
   * Lấy product theo ID
   */
  async getProductById(id) {
    const product = await this.productRepo.getProductById(id);
    if (!product) {
      throw new Error('Product not found');
    }

    return this._enrichProductWithDetails(product);
  }

  /**
   * Cập nhật product (chỉ admin)
   */
  async updateProduct(id, updateData) {
    // Validate
    if (updateData.price !== undefined && updateData.price < 0) {
      throw new Error('Price must be >= 0');
    }
    if (updateData.quantity !== undefined && updateData.quantity < 0) {
      throw new Error('Quantity must be >= 0');
    }

    // Kiểm tra category nếu có update
    if (updateData.categoryId) {
      const category = await this.categoryRepo.getCategoryById(updateData.categoryId);
      if (!category) {
        throw new Error('Category not found');
      }
    }

    const product = await this.productRepo.updateProduct(id, updateData);
    return this._enrichProductWithDetails(product);
  }

  /**
   * Xóa product (soft delete - chỉ admin)
   */
  async deleteProduct(id) {
    const product = await this.productRepo.softDeleteProduct(id);
    return { message: 'Product deleted', id };
  }

  /**
   * Tìm kiếm & lọc products
   * - Lọc theo category
   * - Lọc theo khoảng giá
   * - Tìm theo tên
   * - Pagination
   */
  async searchProducts(criteria = {}) {
    const result = await this.productRepo.searchProducts(criteria);
    return {
      items: result.items.map(p => this._enrichProductWithDetails(p)),
      lastKey: result.lastKey,
      count: result.count,
      scannedCount: result.scannedCount, // Để SV hiểu RCU cost
      note: 'scannedCount > count có nghĩa Scan đã duyệt nhiều items và filter'
    };
  }

  /**
   * Lấy tổng hàng tồn kho
   */
  async getTotalInventory() {
    const result = await this.productRepo.getAllProducts(1000);
    let total = 0;
    let lowStock = 0;
    let outOfStock = 0;

    result.items.forEach(product => {
      total += product.quantity;
      const status = this.productRepo.getInventoryStatus(product.quantity);
      if (status === 'Sắp hết') lowStock++;
      if (status === 'Hết hàng') outOfStock++;
    });

    return { total, lowStock, outOfStock };
  }

  /**
   * Enrichment - thêm thông tin chi tiết vào product
   */
  async _enrichProductWithDetails(product) {
    const category = await this.categoryRepo.getCategoryById(product.categoryId);
    const inventoryStatus = this.productRepo.getInventoryStatus(product.quantity);

    return {
      ...product,
      categoryName: category?.name || 'Unknown',
      inventoryStatus,
      isLowStock: inventoryStatus === 'Sắp hết',
      isOutOfStock: inventoryStatus === 'Hết hàng'
    };
  }

  /**
   * Enrichment đơn giản - chỉ thêm category name
   */
  async _enrichProductWithCategory(product) {
    const category = await this.categoryRepo.getCategoryById(product.categoryId);
    return {
      ...product,
      categoryName: category?.name || 'Unknown'
    };
  }
}

module.exports = ProductService;
