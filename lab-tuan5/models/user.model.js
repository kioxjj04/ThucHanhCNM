const dynamoDb = require('../db/dynamodb');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || 'Users';

class UserModel {
    static async findByUsername(username) {
        try {
            const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: { username }
            });
            
            const response = await dynamoDb.send(command);
            return response.Item;
        } catch (error) {
            console.error('Error finding user by username:', error);
            throw error;
        }
    }

    static async create(username, password) {
        try {
            const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                    username,
                    password,
                    createdAt: new Date().toISOString()
                }
            });
            
            await dynamoDb.send(command);
            return { username };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }
}

module.exports = UserModel;
