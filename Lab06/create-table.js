const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: 'fake',
  secretAccessKey: 'fake'
});

const dynamodb = new AWS.DynamoDB();

const params = {
  TableName: "Products",
  KeySchema: [
    { AttributeName: "id", KeyType: "HASH" }
  ],
  AttributeDefinitions: [
    { AttributeName: "id", AttributeType: "S" }
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5
  }
};

dynamodb.createTable(params, (err, data) => {
  if (err) console.error(err);
  else console.log("Table created:", data);
});