const Order = require('../models/order.model');
const { lockInventory, unlockInventory } = require('../services/order.service');

exports.create = async (req, res) => {
  const { customer, items, paymentReceived } = req.body;
  await lockInventory(items);
  const order = await Order.create({ customer, items, paymentReceived });
  global.io.emit('order-updated', order); // emit to WebSocket
  res.status(201).json(order);
};

exports.getAll = async (req, res) => {
  const orders = await Order.find()
    .populate('customer')
    .populate('items.product')
    .sort({ createdAt: -1 });
  res.json(orders);
};

exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const order = await Order.findById(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // revert inventory if order is cancelled
  if (order.status !== 'CANCELLED' && status === 'CANCELLED') {
    await unlockInventory(order.items);
  }

  order.status = status;
  await order.save();
  global.io.emit('order-updated', order);
  res.json(order);
};
