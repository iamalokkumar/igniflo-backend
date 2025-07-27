const Order = require('../models/order.model');
const Product = require('../models/product.model');

async function lockInventory(items) {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product || product.stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${product?.name || 'Unknown'}`);
    }
    product.stock -= item.quantity;
    await product.save();
  }
}

async function unlockInventory(items) {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }
}

module.exports = {
  lockInventory,
  unlockInventory,
};
