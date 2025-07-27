const Order = require('../models/order.model');
const Product = require('../models/product.model');
const Customer = require('../models/customer.model');
const { lockInventory, unlockInventory } = require('../services/order.service');

// Helper: Find or create customer by email
async function getOrCreateCustomer({ name, email, phone }) {
  let customer = await Customer.findOne({ email });
  if (!customer) {
    customer = await Customer.create({ name, email, phone });
  }
  return customer;
}

// Create Order
exports.create = async (req, res) => {
  const { customer: customerData, items, paymentReceived } = req.body;

  try {
    // Validate customer
    if (!customerData || !customerData.email || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Customer and valid items are required' });
    }

    // Create or fetch customer
    const customer = await getOrCreateCustomer(customerData);

    const resolvedItems = [];

    for (const item of items) {
      if (!item.product || !item.quantity || isNaN(item.quantity)) {
        return res.status(400).json({ error: 'Invalid product or quantity in items' });
      }

      let productDoc;

      // If it's a valid ObjectId
      if (typeof item.product === 'string' && item.product.match(/^[0-9a-fA-F]{24}$/)) {
        productDoc = await Product.findById(item.product);
      } else {
        // Try to find by product name
        productDoc = await Product.findOne({ name: item.product });

        // Auto-create product if not found
        if (!productDoc && typeof item.product === 'string') {
          productDoc = await Product.create({
            name: item.product,
            stock: 100,      // default stock
            price: 100       // default price
          });
        }
      }

      if (!productDoc) {
        return res.status(400).json({ error: `Product '${item.product}' not found or invalid.` });
      }

      resolvedItems.push({
        product: productDoc._id,
        quantity: Number(item.quantity),
      });
    }

    // Lock inventory for all items
    await lockInventory(resolvedItems);

    // Create order
    const order = await Order.create({
      customer: customer._id,
      items: resolvedItems,
      paymentReceived,
    });

    // Emit socket event
    global.io.emit('order-created', order);
    res.status(201).json(order);
  } catch (err) {
    console.error('❌ Error creating order:', err);
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
    console.error('❌ Error fetching orders:', err);
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

    // Unlock inventory if cancelled
    if (order.status !== 'CANCELLED' && status === 'CANCELLED') {
      await unlockInventory(order.items);
    }

    order.status = status;
    await order.save();

    // Emit updated status
    global.io.emit('order-updated', order);
    res.json(order);
  } catch (err) {
    console.error('❌ Error updating status:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};
