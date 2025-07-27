const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const { lockInventory, unlockInventory } = require('../services/order.service');

// 🔁 Create or get existing customer
async function getOrCreateCustomer({ name, email, phone }) {
  let customer = await Customer.findOne({ email });
  if (!customer) {
    customer = await Customer.create({ name, email, phone });
  }
  return customer;
}

// 🧾 Create Order
exports.create = async (req, res) => {
  const { customer: customerData, items, paymentReceived } = req.body;

  try {
    if (!customerData || !customerData.email || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and items are required' });
    }

    // 👤 Ensure customer exists or create new
    const customer = await getOrCreateCustomer(customerData);

    const resolvedItems = [];

    for (const item of items) {
      let productDoc;

      // Check if it's an ObjectId
      if (item.product.match(/^[0-9a-fA-F]{24}$/)) {
        productDoc = await Product.findById(item.product);
      } else {
        productDoc = await Product.findOne({ name: item.product });

        // ✅ Auto-create new product if not found
        if (!productDoc) {
          productDoc = await Product.create({
            name: item.product,
            stock: 100,
            price: 100,
            sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Required field
          });
        }
      }

      resolvedItems.push({
        product: productDoc._id,
        quantity: item.quantity,
      });
    }

    // 🔒 Lock inventory
    await lockInventory(resolvedItems);

    // 🧾 Create the order
    const order = await Order.create({
      customer: customer._id,
      items: resolvedItems,
      paymentReceived,
    });

    // 📡 Notify via WebSocket
    global.io.emit('order-created', order);

    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Error creating order:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// 📋 Get All Orders
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

// 🔄 Update Order Status
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Unlock inventory if order is cancelled
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
