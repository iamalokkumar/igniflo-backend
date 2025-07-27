require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/product.model');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.deleteMany();

  await Product.insertMany([
    { name: 'Laptop', sku: 'LP1001', stock: 10, price: 900 },
    { name: 'Phone', sku: 'PH1002', stock: 15, price: 600 },
  ]);

  console.log('✅ Seeding complete');
  process.exit();
};

seed();
