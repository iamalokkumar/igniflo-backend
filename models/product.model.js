const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  stock: { type: Number, default: 0 },
  price: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
