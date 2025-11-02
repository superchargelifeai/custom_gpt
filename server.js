require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  trustProxy: true // enable proxied IP detection for rate limiting
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://chat.openai.com'] : true,
  credentials: true
}));

// Body parsing
const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: true });

app.use((req, res, next) => {
  if (req.originalUrl === '/stripe/webhook') {
    return next();
  }

  return jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl === '/stripe/webhook') {
    return next();
  }

  return urlencodedParser(req, res, next);
});

// Raw body for webhooks
app.use('/stripe/webhook', bodyParser.raw({ type: 'application/json' }));

// Import routes
const accessRoutes = require('./src/routes/access');
const stripeRoutes = require('./src/routes/stripe');

// Import error handling middleware
const { errorHandler, notFound } = require("./src/middleware/errorHandler");

// Use routes
app.use('/api', accessRoutes);
app.use('/stripe', stripeRoutes);

// Debug endpoint for latest checkout session
app.get('/debug/latest-session', async (req, res) => {
  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 1,
      expand: ['data.url']
    });
    if (sessions.data.length > 0) {
      const session = sessions.data[0];
      res.json({
        id: session.id,
        url: session.url,
        url_length: session.url.length
      });
    } else {
      res.json({ error: "No sessions found" });
    }
  } catch (error) {
    console.error("Error retrieving sessions:", error);
    res.status(500).json({ error: "Error retrieving sessions" });
  }
});

// Handle health check POST requests to the root path
app.post('/', (req, res) => {
  // This is a health check from some clients (like GPT Actions)
  // We don't need to do anything, just respond with 200 OK to clean up logs
  res.status(200).send('OK');
});

// Health check for GET requests
app.get('/', (req, res) => {
  res.status(200).send('GPT Paywall API is running.');
});

// Fallback error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`⚡️ Server running on port ${PORT}`);
});
