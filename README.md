# Custom GPT API

This project exposes Airtable- and Stripe-backed endpoints that power a Custom GPT paywall experience. The API is packaged for deployment on Vercel and includes helpers for local development.

## Prerequisites

- Node.js 18 or newer
- A Vercel account (for deployment)
- Airtable base with the required fields
- Stripe account with subscription products

## Environment variables

Copy `.env.example` to `.env` (do **not** commit the `.env` file) and fill in your secrets:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `AIRTABLE_API_KEY` | Airtable API key with access to the base |
| `AIRTABLE_BASE_ID` | Airtable base identifier |
| `AIRTABLE_TABLE_NAME` | Airtable table name that stores subscribers |
| `AIRTABLE_EMAIL_FIELD` | (Optional) Field name for the email column |
| `AIRTABLE_PLAN_FIELD` | (Optional) Field name for the plan column |
| `AIRTABLE_STATUS_FIELD` | (Optional) Field name for the subscription status |
| `AIRTABLE_SUBSCRIPTION_START_FIELD` | (Optional) Field name for subscription start timestamps |
| `AIRTABLE_SUBSCRIPTION_END_FIELD` | (Optional) Field name for subscription end timestamps |
| `API_KEY` | Shared secret required in the `X-API-Key` header |
| `STRIPE_SECRET_KEY` | Stripe secret API key |
| `STRIPE_PRICE_ID` | Default Stripe price used in checkout |
| `STRIPE_WEBHOOK_SECRET` | Secret for verifying Stripe webhooks |
| `SITE_BASE_URL` | Base URL used when building success and cancel URLs |

## Installation

Install dependencies (the `--legacy-peer-deps` flag can help in restricted environments):

```bash
npm install
```

## Local development

Use the Vercel CLI to run the API locally:

```bash
npm run dev
```

The CLI proxies requests to the serverless function handlers located in the `api/` directory. Ensure you send the `X-API-Key` header with your configured `API_KEY` value when invoking any endpoint.

## Deployment

1. Commit your changes and push to GitHub.
2. Import the repository in Vercel and select the project.
3. Configure the environment variables listed above in the Vercel dashboard.
4. Deploy the project—Vercel will route `/api/*` requests to `api/index.js` and `/stripe/*` requests to `api/stripe.js` using the provided `vercel.json` configuration.

## Available endpoints

All endpoints require the `X-API-Key` header.

- `GET /api/check-access` – Determine whether an email currently has premium access.
- `POST /api/check-email` – Check whether an Airtable record already exists for an email.
- `POST /api/create-record` – Create a new Airtable record.
- `POST /api/update-subscription` – Update subscription fields on an existing record.
- `POST /api/start-subscription` – Create or update a record with subscription defaults.
- `POST /stripe/create-checkout-session` – Create a Stripe Checkout session for subscriptions.
- `POST /stripe/create-portal-session` – Generate a Stripe Customer Portal session.
- `POST /stripe/webhook` – Receive Stripe webhook events (signature verified with `STRIPE_WEBHOOK_SECRET`).

Refer to `schema.json` or `openapi.yaml` for the complete schema used by the Custom GPT integration.
