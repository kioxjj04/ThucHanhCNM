const Product = require('../models/productModel');
const { v4: uuidv4 } = require('uuid');

exports.index = async (req, res) => {
  const data = await Product.getAll();
  res.render('products/index', { products: data.Items });
};

exports.createForm = (req, res) => {
  res.render('products/create');
};

exports.create = async (req, res) => {
  const file = req.file;
  const product = {
    id: uuidv4(),
    name: req.body.name,
    price: Number(req.body.price),
    unit_in_stock: Number(req.body.stock),
    url_image: file ? '/uploads/' + file.filename : ''
  };

  await Product.create(product);
  res.redirect('/');
};

exports.editForm = async (req, res) => {
  const data = await Product.getById(req.params.id);
  res.render('products/edit', { product: data.Item });
};

exports.update = async (req, res) => {
  const old = await Product.getById(req.params.id);
  const file = req.file;

  const updated = {
    id: req.params.id,
    name: req.body.name,
    price: Number(req.body.price),
    unit_in_stock: Number(req.body.stock),
    url_image: file ? '/uploads/' + file.filename : old.Item.url_image
  };

  await Product.update(updated);
  res.redirect('/');
};
//also delete the image file from uploads folder if exists
exports.delete = async (req, res) => {
  await Product.delete(req.params.id);
  res.redirect('/');
};

exports.detail = async (req, res) => {
  const data = await Product.getById(req.params.id);
  res.render('products/detail', { product: data.Item });
};

exports.index = async (req, res) => {
  const keyword = req.query.keyword;

  let params = {
    TableName: "Products"
  };

  if (keyword) {
    params.FilterExpression = "contains(#name, :keyword)";
    params.ExpressionAttributeNames = {
      "#name": "name"
    };
    params.ExpressionAttributeValues = {
      ":keyword": keyword
    };
  }

  const data = await Product.scan(params);

  res.render('products/index', {
    products: data.Items,
    keyword: keyword || ''
  });
};