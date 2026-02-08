require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const endpoint = process.env.DYNAMODB_ENDPOINT || process.env.DYNAMO_ENDPOINT || (process.env.AWS_ACCESS_KEY_ID === 'local' ? 'http://localhost:8000' : undefined);

const clientConfig = {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

if (endpoint) {
    clientConfig.endpoint = endpoint;
}

const client = new DynamoDBClient(clientConfig);

const dynamoDb = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false
    },
    unmarshallOptions: {
        wrapNumbers: false
    }
});

module.exports = dynamoDb;
