const Order = require('../models/order.model');
const { lockInventory, unlockInventory } = require('../services/order.service');

// Create a new order
exports.create = async (req, res) => {
  try {
    const { customer, items, paymentReceived, orderName } = req.body;

    await lockInventory(items);

    const order = await Order.create({ customer, items, paymentReceived, orderName });

    // Emit "order-created" to all WebSocket clients
    global.io.emit('order-created', order);

    res.status(201).json(order);
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get all orders with pagination
exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Order.countDocuments();

    const orders = await Order.find()
      .populate('customer')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({ total, page, limit, orders });
  } catch (err) {
    console.error('Error fetching orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Update order status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Unlock inventory if status becomes CANCELLED
    if (order.status !== 'CANCELLED' && status === 'CANCELLED') {
      await unlockInventory(order.items);
    }

    order.status = status;
    await order.save();
   global.io.emit('order-created', order); // inside exports.create

// After updating status
global.io.emit('order-updated', order); 

    res.json(order);
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
