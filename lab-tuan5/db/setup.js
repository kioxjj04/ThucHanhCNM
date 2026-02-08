require('dotenv').config();
const { CreateTableCommand, ListTablesCommand,DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

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

async function setupTables() {
    try {
        const listTablesCommand = new ListTablesCommand({});
        const { TableNames } = await client.send(listTablesCommand);
        
        console.log('Existing tables:', TableNames);

        if (!TableNames.includes('Products')) {
            const createProductsTableCommand = new CreateTableCommand({
                TableName: 'Products',
                KeySchema: [
                    { AttributeName: 'id', KeyType: 'HASH' }
                ],
                AttributeDefinitions: [
                    { AttributeName: 'id', AttributeType: 'S' }
                ],
                BillingMode: 'PAY_PER_REQUEST'
            });

            await client.send(createProductsTableCommand);
            console.log('✅ Created Products table');
        } else {
            console.log('✅ Products table already exists');
        }

        if (!TableNames.includes('Users')) {
            const createUsersTableCommand = new CreateTableCommand({
                TableName: 'Users',
                KeySchema: [
                    { AttributeName: 'username', KeyType: 'HASH' }
                ],
                AttributeDefinitions: [
                    { AttributeName: 'username', AttributeType: 'S' }
                ],
                BillingMode: 'PAY_PER_REQUEST'
            });

            await client.send(createUsersTableCommand);
            console.log('✅ Created Users table');
        } else {
            console.log('✅ Users table already exists');
        }

        const tableDescriptions = await Promise.all([
            client.send(new DescribeTableCommand({ TableName: 'Products' })),
            client.send(new DescribeTableCommand({ TableName: 'Users' }))
        ]);

        console.log('Table descriptions retrieved successfully:', tableDescriptions.map(t => t.Table.TableName));

    } catch (error) {
        console.error('❌ Error setting up tables:', error);
    }
}

setupTables();
