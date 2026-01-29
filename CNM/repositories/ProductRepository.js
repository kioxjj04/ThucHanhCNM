const { v4: uuidv4 } = require('uuid');
const { dynamodb, s3, tableName } = require('../config/aws');

class ProductRepository {
  /**
   * Tạo product mới
   */
  async createProduct(name, price, quantity, categoryId, imageUrl = null) {
    const id = uuidv4();

    const params = {
      TableName: tableName.products,
      Item: {
        id,
        name,
        price,
        quantity,
        categoryId,
        url_image: imageUrl,
        isDeleted: false,
        createdAt: new Date().toISOString()
      }
    };

    await dynamodb.put(params).promise();
    
    // Ghi log
    await this.logProductAction('CREATE', id, null);
    
    return params.Item;
  }

  /**
   * Lấy tất cả products (không bao gồm soft deleted)
   */
  async getAllProducts(limit = 20, lastKey = null) {
    const params = {
      TableName: tableName.products,
      FilterExpression: 'isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':isDeleted': false
      },
      Limit: limit
    };

    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await dynamodb.scan(params).promise();
    return {
      items: result.Items || [],
      lastKey: result.LastEvaluatedKey
    };
  }

  /**
   * Lấy product theo ID
   */
  async getProductById(id) {
    const params = {
      TableName: tableName.products,
      Key: { id }
    };

    const result = await dynamodb.get(params).promise();
    
    // Không trả về nếu đã bị xóa (soft delete)
    if (result.Item && result.Item.isDeleted) {
      return null;
    }

    return result.Item || null;
  }

  /**
   * Cập nhật product
   */
  async updateProduct(id, updateData) {
    const productBefore = await this.getProductById(id);
    if (!productBefore) {
      throw new Error('Product not found');
    }

    let updateExpression = 'SET ';
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    const updateFields = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id') {
        const attrName = `#${key}`;
        const attrValue = `:${key}`;
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
        updateFields.push(`${attrName} = ${attrValue}`);
      }
    }

    updateExpression += updateFields.join(', ') + ', updatedAt = :updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: tableName.products,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();

    // Ghi log UPDATE
    await this.logProductAction('UPDATE', id, productBefore);

    return result.Attributes;
  }

  /**
   * Soft delete product
   * Chỉ đánh dấu isDeleted = true, không xóa khỏi DB
   */
  async softDeleteProduct(id) {
    const productBefore = await this.getProductById(id);
    if (!productBefore) {
      throw new Error('Product not found');
    }

    const params = {
      TableName: tableName.products,
      Key: { id },
      UpdateExpression: 'SET isDeleted = :isDeleted, deletedAt = :deletedAt',
      ExpressionAttributeValues: {
        ':isDeleted': true,
        ':deletedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamodb.update(params).promise();

    // Xóa ảnh từ S3 nếu có
    if (productBefore.url_image) {
      await this.deleteImageFromS3(productBefore.url_image);
    }

    // Ghi log DELETE
    await this.logProductAction('DELETE', id, productBefore);

    return result.Attributes;
  }

  /**
   * Tìm kiếm products theo nhiều tiêu chí
   * - Theo tên (contains)
   * - Theo category
   * - Theo khoảng giá
   * - Pagination
   * 
   * LƯU Ý: DynamoDB không hỗ trợ LIKE query trực tiếp
   * Phương pháp 1: Sử dụng Query (nếu có GSI) - hiệu quả
   * Phương pháp 2: Sử dụng Scan + Filter - tốn chi phí
   */
  async searchProducts(criteria = {}) {
    const { categoryId, minPrice, maxPrice, name, limit = 20, lastKey = null } = criteria;

    let params = {
      TableName: tableName.products,
      FilterExpression: 'isDeleted = :isDeleted',
      ExpressionAttributeValues: {
        ':isDeleted': false
      }
    };

    // Thêm filter theo category nếu có
    if (categoryId) {
      params.FilterExpression += ' AND categoryId = :categoryId';
      params.ExpressionAttributeValues[':categoryId'] = categoryId;
    }

    // Thêm filter theo khoảng giá
    if (minPrice !== undefined && maxPrice !== undefined) {
      params.FilterExpression += ' AND price BETWEEN :minPrice AND :maxPrice';
      params.ExpressionAttributeValues[':minPrice'] = minPrice;
      params.ExpressionAttributeValues[':maxPrice'] = maxPrice;
    } else if (minPrice !== undefined) {
      params.FilterExpression += ' AND price >= :minPrice';
      params.ExpressionAttributeValues[':minPrice'] = minPrice;
    } else if (maxPrice !== undefined) {
      params.FilterExpression += ' AND price <= :maxPrice';
      params.ExpressionAttributeValues[':maxPrice'] = maxPrice;
    }

    // Thêm filter theo tên (contains) - phải dùng SCAN
    // ⚠️ Cảnh báo: Điều này tốn nhiều RCU khi dữ liệu lớn
    if (name) {
      params.FilterExpression += ' AND contains(#name, :name)';
      params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
      params.ExpressionAttributeNames['#name'] = 'name';
      params.ExpressionAttributeValues[':name'] = name;
    }

    params.Limit = limit;
    if (lastKey) {
      params.ExclusiveStartKey = lastKey;
    }

    const result = await dynamodb.scan(params).promise();
    return {
      items: result.Items || [],
      lastKey: result.LastEvaluatedKey,
      count: result.Count,
      scannedCount: result.ScannedCount
    };
  }

  /**
   * Lấy trạng thái tồn kho
   */
  getInventoryStatus(quantity) {
    if (quantity === 0) return 'Hết hàng';
    if (quantity < 5) return 'Sắp hết';
    return 'Còn hàng';
  }

  /**
   * Ghi log thao tác trên sản phẩm
   */
  async logProductAction(action, productId, oldData = null, userId = 'system') {
    const logId = uuidv4();

    const params = {
      TableName: tableName.logs,
      Item: {
        logId,
        productId,
        action, // CREATE, UPDATE, DELETE
        userId,
        time: new Date().toISOString(),
        oldData: oldData || null
      }
    };

    await dynamodb.put(params).promise();
  }

  /**
   * Xóa ảnh từ S3
   */
  async deleteImageFromS3(imageUrl) {
    try {
      // Parse S3 key từ URL
      const key = imageUrl.split('/').pop();
      
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      };

      await s3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      // Không throw error, chỉ log
    }
  }
}

module.exports = ProductRepository;
