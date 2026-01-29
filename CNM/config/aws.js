const AWS = require('aws-sdk');

// Cấu hình AWS SDK sử dụng IAM Role (không hard-code credentials)
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'ap-southeast-1'
});

const s3 = new AWS.S3({
  region: process.env.S3_REGION || 'ap-southeast-1'
});

module.exports = {
  dynamodb,
  s3,
  tableName: {
    users: process.env.DYNAMODB_TABLE_USERS || 'Users',
    categories: process.env.DYNAMODB_TABLE_CATEGORIES || 'Categories',
    products: process.env.DYNAMODB_TABLE_PRODUCTS || 'Products',
    logs: process.env.DYNAMODB_TABLE_LOGS || 'ProductLogs'
  }
};
