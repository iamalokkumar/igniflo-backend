const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: Number,
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [orderItemSchema],
  paymentReceived: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED'],
    default: 'PENDING',
  },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
