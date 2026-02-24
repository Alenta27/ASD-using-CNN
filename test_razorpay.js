// Test script to verify Razorpay integration
require('dotenv').config();
const Razorpay = require('razorpay');

console.log('\n=== Testing Razorpay Configuration ===\n');

// Check environment variables
console.log('1. Checking Environment Variables:');
console.log('   RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing');
console.log('   RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✓ Set' : '✗ Missing');

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('\n❌ Razorpay credentials missing in .env file');
  process.exit(1);
}

// Initialize Razorpay
console.log('\n2. Initializing Razorpay instance...');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
console.log('   ✓ Razorpay instance created');

// Test order creation
console.log('\n3. Testing Order Creation...');
const options = {
  amount: 99900, // ₹999 in paise
  currency: 'INR',
  receipt: `test_receipt_${Date.now()}`,
  notes: {
    test: 'Speech Therapy Pro Test Order'
  }
};

razorpay.orders.create(options)
  .then(order => {
    console.log('   ✓ Order created successfully!');
    console.log('   Order ID:', order.id);
    console.log('   Amount:', order.amount / 100, 'INR');
    console.log('   Currency:', order.currency);
    console.log('\n✅ Razorpay integration is working correctly!\n');
    console.log('Key ID to use in frontend:', process.env.RAZORPAY_KEY_ID);
  })
  .catch(error => {
    console.error('   ✗ Order creation failed');
    console.error('   Error:', error.error || error.message);
    console.log('\n❌ Razorpay integration test failed\n');
    process.exit(1);
  });
