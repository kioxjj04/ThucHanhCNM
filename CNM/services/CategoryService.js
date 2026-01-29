const CategoryRepository = require('../repositories/CategoryRepository');

class CategoryService {
  constructor() {
    this.categoryRepo = new CategoryRepository();
  }

  /**
   * Tạo category mới (chỉ admin)
   */
  async createCategory(name, description) {
    if (!name || !description) {
      throw new Error('Name and description are required');
    }

    const category = await this.categoryRepo.createCategory(name, description);
    return category;
  }

  /**
   * Lấy tất cả categories
   */
  async getAllCategories() {
    return await this.categoryRepo.getAllCategories();
  }

  /**
   * Lấy category theo ID
   */
  async getCategoryById(categoryId) {
    const category = await this.categoryRepo.getCategoryById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  }

  /**
   * Cập nhật category (chỉ admin)
   */
  async updateCategory(categoryId, name, description) {
    if (!name || !description) {
      throw new Error('Name and description are required');
    }

    const category = await this.categoryRepo.updateCategory(categoryId, name, description);
    return category;
  }

  /**
   * Xóa category (chỉ admin)
   * Business rule: Khi xóa category, không xóa sản phẩm
   * Nhưng phải check xem category có sản phẩm không
   */
  async deleteCategory(categoryId) {
    try {
      await this.categoryRepo.deleteCategory(categoryId);
      return { message: 'Category deleted successfully' };
    } catch (error) {
      if (error.message.includes('Cannot delete category')) {
        throw new Error('Cannot delete category with active products');
      }
      throw error;
    }
  }
}

module.exports = CategoryService;
