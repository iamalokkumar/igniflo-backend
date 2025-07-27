const Product = require('../models/product.model');

exports.create = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

exports.getAll = async (req, res) => {
  const products = await Product.find();
  res.json(products);
};
