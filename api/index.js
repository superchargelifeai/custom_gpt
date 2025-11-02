const express = require('express');
const cors = require('cors');

if (process.env.NODE_ENV !== 'production') {
  // Load environment variables from .env during local development
  require('dotenv').config();
}

const accessRoutes = require('../src/routes/access');
const { errorHandler, notFound } = require('../src/middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

const requiredApiKey = process.env.API_KEY;

const apiKeyMiddleware = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
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
app.use('/api', accessRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
