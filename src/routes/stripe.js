const express = require('express');
const Stripe = require('stripe');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY must be set');
}

const stripe = Stripe(stripeSecretKey);

function buildUrl(target, fallbackPath) {
  if (target && /^https?:\/\//i.test(target)) {
    return target;
  }

  const path = target || fallbackPath;
  const baseUrl = process.env.SITE_BASE_URL;

  if (!baseUrl) {
    return path;
  }

  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

router.post(
  '/create-checkout-session',
  asyncHandler(async (req, res) => {
    const {
      email,
      priceId = process.env.STRIPE_PRICE_ID,
      successUrl,
      cancelUrl,
      successPath = '/success?session_id={CHECKOUT_SESSION_ID}',
      cancelPath = '/cancel'
    } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    if (!priceId) {
      res.status(400);
      throw new Error('Price ID is required');
    }

    let success = buildUrl(successUrl, successPath);

    if (!success.includes('{CHECKOUT_SESSION_ID}')) {
      success += success.includes('?') ? '&' : '?';
      success += 'session_id={CHECKOUT_SESSION_ID}';
    }

    const cancel = buildUrl(cancelUrl, cancelPath);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: success,
      cancel_url: cancel
    });

    res.json({
      session_id: session.id,
      url: session.url
    });
  })
);

router.post(
    '/create-portal-session',
    asyncHandler(async (req, res) => {
      const { email, customerId, returnUrl, returnPath = '/' } = req.body;

    let targetCustomerId = customerId;

    if (!targetCustomerId) {
      if (!email) {
        res.status(400);
        throw new Error('Either customerId or email is required');
      }

      const customers = await stripe.customers.list({
        email,
        limit: 1
      });

      if (!customers.data.length) {
        res.status(404);
        throw new Error('Customer not found');
      }

      targetCustomerId = customers.data[0].id;
    }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: targetCustomerId,
        return_url: buildUrl(returnUrl, returnPath)
      });

    res.json({
      portal_url: portalSession.url
    });
  })
);

router.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    res.status(400).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // Process the event if necessary.
  // Placeholder for future event-specific logic.

  res.json({ received: true, type: event.type });
});

module.exports = router;
