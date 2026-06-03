const express = require('express');
const { getDb, get } = require('../db');

const router = express.Router();

let stripe;
function getStripe() {
  if (!stripe) {
    const Stripe = require('stripe');
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }
  return stripe;
}

router.post('/create-checkout-session', async (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    await getDb();
    const lineItems = [];
    for (const item of items) {
      const product = get('SELECT * FROM products WHERE id = ? AND available = 1', [item.id]);
      if (!product) {
        return res.status(400).json({ error: `Product with id ${item.id} not found or unavailable` });
      }
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: product.description.substring(0, 100),
          },
          unit_amount: product.price,
        },
        quantity: item.quantity || 1,
      });
    }

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Payment processing error' });
  }
});

module.exports = router;
