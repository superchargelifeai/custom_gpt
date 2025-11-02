const express = require('express');
const cors = require('cors');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const stripeRoutes = require('../src/routes/stripe');
const { errorHandler, notFound } = require('../src/middleware/errorHandler');

const app = express();

app.use(cors());

const jsonParser = express.json();
const urlencodedParser = express.urlencoded({ extended: true });

app.use((req, res, next) => {
  if (req.originalUrl === '/stripe/webhook') {
    next();
    return;
  }

  jsonParser(req, res, next);
});

app.use((req, res, next) => {
  if (req.originalUrl === '/stripe/webhook') {
    next();
    return;
  }

  urlencodedParser(req, res, next);
});

app.use('/stripe/webhook', express.raw({ type: 'application/json' }));

const requiredApiKey = process.env.API_KEY;

const apiKeyMiddleware = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const requestPath = req.originalUrl || req.path;

  if (requestPath === '/stripe/webhook') {
    next();
    return;
  }

  if (!requiredApiKey) {
    res.status(500).json({ error: 'API key is not configured' });
    return;
  }

  const providedKey = req.headers['x-api-key'];

  if (!providedKey || providedKey !== requiredApiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

app.use(apiKeyMiddleware);
app.use('/stripe', stripeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
