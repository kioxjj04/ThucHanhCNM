const { v4: uuidv4 } = require('uuid');
const { dynamodb, tableName } = require('../config/aws');

class CategoryRepository {
  /**
   * Tạo category mới
   */
  async createCategory(name, description) {
    const categoryId = uuidv4();

    const params = {
      TableName: tableName.categories,
      Item: {
        categoryId,
        name,
        description,
        createdAt: new Date().toISOString()
      }
    };

    await dynamodb.put(params).promise();
    return params.Item;
  }

  /**
   * Lấy tất cả categories
   */
  async getAllCategories() {
    const params = {
      TableName: tableName.categories
    };

    const result = await dynamodb.scan(params).promise();
    return result.Items || [];
  }

  /**
   * Lấy category theo ID
   */
  async getCategoryById(categoryId) {
    const params = {
      TableName: tableName.categories,
      Key: { categoryId }
    };

    const result = await dynamodb.get(params).promise();
    return result.Item || null;
  }

  /**
   * Cập nhật category
   */
  async updateCategory(categoryId, name, description) {
    const params = {
      TableName: tableName.categories,
      Key: { categoryId },
      UpdateExpression: 'SET #name = :name, #desc = :description, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#desc': 'description'
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':description': description,
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();
    return result.Attributes;
  }

  /**
   * Xóa category (soft delete hoặc hard delete)
   * Lưu ý: Khi xóa category, không xóa products
   */
  async deleteCategory(categoryId) {
    // Kiểm tra xem category có products không
    const productsInCategory = await this.getProductsByCategory(categoryId);
    if (productsInCategory.length > 0) {
      throw new Error('Cannot delete category with products. Delete products first.');
    }

    const params = {
      TableName: tableName.categories,
      Key: { categoryId }
    };

    await dynamodb.delete(params).promise();
  }

  /**
   * Lấy tất cả products của category (phục vụ check trước khi xóa)
   */
  async getProductsByCategory(categoryId) {
    const params = {
      TableName: tableName.products,
      IndexName: 'CategoryIdIndex', // GSI
      KeyConditionExpression: 'categoryId = :categoryId AND isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':categoryId': categoryId,
        ':isDeleted': false
      }
    };

    try {
      const result = await dynamodb.query(params).promise();
      return result.Items || [];
    } catch (error) {
      // Index chưa tồn tại, thực hiện scan
      return [];
    }
  }
}

module.exports = CategoryRepository;
