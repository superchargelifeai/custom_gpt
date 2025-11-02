const Airtable = require('airtable');

const {
  AIRTABLE_API_KEY,
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_NAME,
  AIRTABLE_EMAIL_FIELD = 'Email',
  AIRTABLE_PLAN_FIELD = 'Plan',
  AIRTABLE_STATUS_FIELD = 'Status',
  AIRTABLE_SUBSCRIPTION_START_FIELD = 'Subscription Start',
  AIRTABLE_SUBSCRIPTION_END_FIELD = 'Subscription End'
} = process.env;

let tableInstance;

function getTable() {
  const apiKey = AIRTABLE_API_KEY || AIRTABLE_TOKEN;

  if (!apiKey || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME) {
    throw new Error('Airtable configuration is missing. Please set AIRTABLE_API_KEY (or AIRTABLE_TOKEN), AIRTABLE_BASE_ID, and AIRTABLE_TABLE_NAME.');
  }

  if (!tableInstance) {
    const base = new Airtable({ apiKey }).base(AIRTABLE_BASE_ID);
    tableInstance = base(AIRTABLE_TABLE_NAME);
  }

  return tableInstance;
}

function sanitizeFormulaValue(value) {
  return String(value).replace(/'/g, "\\'");
}

function mapRecord(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    fields: { ...record.fields },
    createdTime: record._rawJson && record._rawJson.createdTime ? record._rawJson.createdTime : null
  };
}

async function findRecordByEmail(email) {
  const table = getTable();
  const normalizedEmail = String(email).toLowerCase();
  const filterFormula = `LOWER({${AIRTABLE_EMAIL_FIELD}}) = '${sanitizeFormulaValue(normalizedEmail)}'`;
  const records = await table
    .select({
      filterByFormula: filterFormula,
      maxRecords: 1
    })
    .firstPage();

  return records && records.length ? records[0] : null;
}

async function getRecordById(recordId) {
  const table = getTable();
  return table.find(recordId);
}

async function createRecord(fields) {
  const table = getTable();
  const created = await table.create([{ fields }]);
  return created && created.length ? created[0] : null;
}

async function updateRecord(recordId, fields) {
  const table = getTable();
  const updated = await table.update([{ id: recordId, fields }]);
  return updated && updated.length ? updated[0] : null;
}

function buildSubscriptionFields({
  plan,
  status,
  subscriptionStart,
  subscriptionEnd
}) {
  const fields = {};

  if (typeof plan !== 'undefined') {
    fields[AIRTABLE_PLAN_FIELD] = plan;
  }

  if (typeof status !== 'undefined') {
    fields[AIRTABLE_STATUS_FIELD] = status;
  }

  if (typeof subscriptionStart !== 'undefined') {
    fields[AIRTABLE_SUBSCRIPTION_START_FIELD] = subscriptionStart;
  }

  if (typeof subscriptionEnd !== 'undefined') {
    fields[AIRTABLE_SUBSCRIPTION_END_FIELD] = subscriptionEnd;
  }

  return fields;
}

module.exports = {
  get constants() {
    return {
      EMAIL_FIELD: AIRTABLE_EMAIL_FIELD,
      PLAN_FIELD: AIRTABLE_PLAN_FIELD,
      STATUS_FIELD: AIRTABLE_STATUS_FIELD,
      SUBSCRIPTION_START_FIELD: AIRTABLE_SUBSCRIPTION_START_FIELD,
      SUBSCRIPTION_END_FIELD: AIRTABLE_SUBSCRIPTION_END_FIELD
    };
  },
  findRecordByEmail,
  getRecordById,
  createRecord,
  updateRecord,
  mapRecord,
  buildSubscriptionFields
};
