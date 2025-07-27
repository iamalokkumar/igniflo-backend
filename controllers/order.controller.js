const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const { lockInventory, unlockInventory } = require('../services/order.service');

// Create or find customer by email
async function getOrCreateCustomer({ name, email, phone }) {
  let customer = await Customer.findOne({ email });
  if (!customer) {
    customer = await Customer.create({ name, email, phone });
  }
  return customer;
}

// Create Order
exports.create = async (req, res) => {
  const { customer, items, paymentReceived } = req.body;

  try {
    const resolvedItems = [];

    // Step 1: Match product name or ID
    for (const item of items) {
      let productDoc;
      if (item.product.match(/^[0-9a-fA-F]{24}$/)) {
        productDoc = await Product.findById(item.product);
      } else {
        productDoc = await Product.findOne({ name: item.product });
      }

      if (!productDoc) {
        return res.status(400).json({ error: `Product '${item.product}' not found.` });
      }

      resolvedItems.push({ product: productDoc._id, quantity: item.quantity });
    }

    // Step 2: Create or reuse customer by email
    const customerDoc = await getOrCreateCustomer(customer);

    // Step 3: Lock stock
    await lockInventory(resolvedItems);

    // Step 4: Create order
    const order = await Order.create({
      customer: customerDoc._id,
      items: resolvedItems,
      paymentReceived,
    });

    global.io.emit('order-created', order); // WebSocket
    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Error creating order:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get All Orders (Paginated)
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
    console.error('❌ Error fetching orders:', err.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Update Order Status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== 'CANCELLED' && status === 'CANCELLED') {
      await unlockInventory(order.items);
    }

    order.status = status;
    await order.save();

    global.io.emit('order-updated', order);
    res.json(order);
  } catch (err) {
    console.error('❌ Error updating status:', err.message);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
