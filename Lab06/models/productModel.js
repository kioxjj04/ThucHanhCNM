const db = require('../config/db');
const TABLE = "Products";

exports.getAll = async () => {
  return await db.scan({ TableName: TABLE }).promise();
};

exports.getById = async (id) => {
  return await db.get({
    TableName: TABLE,
    Key: { id }
  }).promise();
};

exports.create = async (product) => {
  return await db.put({
    TableName: TABLE,
    Item: product
  }).promise();
};

exports.update = async (product) => {
  return await db.put({
    TableName: TABLE,
    Item: product
  }).promise();
};

exports.delete = async (id) => {
  return await db.delete({
    TableName: TABLE,
    Key: { id }
  }).promise();
};

exports.scan = async (params) => {
  return await db.scan(params).promise();
};