const Customer = require('../models/customer.model');

exports.create = async (req, res) => {
  const customer = await Customer.create(req.body);
  res.status(201).json(customer);
};

exports.getAll = async (req, res) => {
  const customers = await Customer.find();
  res.json(customers);
};
