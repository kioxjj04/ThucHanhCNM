const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { dynamodb, tableName } = require('../config/aws');

class UserRepository {
  /**
   * Tạo user mới
   * @param {string} username - Tên đăng nhập
   * @param {string} password - Mật khẩu (sẽ hash)
   * @param {string} role - admin hoặc staff
   */
  async createUser(username, password, role = 'staff') {
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    const params = {
      TableName: tableName.users,
      Item: {
        userId,
        username,
        password: hashedPassword,
        role,
        createdAt: new Date().toISOString()
      }
    };

    await dynamodb.put(params).promise();
    return { userId, username, role, createdAt: params.Item.createdAt };
  }

  /**
   * Lấy user theo username
   */
  async getUserByUsername(username) {
    const params = {
      TableName: tableName.users,
      IndexName: 'UsernameIndex', // GSI cần tạo trên DynamoDB Console
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username
      }
    };

    const result = await dynamodb.query(params).promise();
    return result.Items?.[0] || null;
  }

  /**
   * Lấy user theo userId
   */
  async getUserById(userId) {
    const params = {
      TableName: tableName.users,
      Key: { userId }
    };

    const result = await dynamodb.get(params).promise();
    return result.Item || null;
  }

  /**
   * Kiểm tra password
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = UserRepository;
