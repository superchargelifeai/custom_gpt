const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const airtableService = require('../services/airtableService');

const router = express.Router();

const { EMAIL_FIELD, PLAN_FIELD, STATUS_FIELD, SUBSCRIPTION_END_FIELD } = airtableService.constants;

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

router.get(
  '/check-access',
  asyncHandler(async (req, res) => {
    const { email } = req.query;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    const record = await airtableService.findRecordByEmail(email);

    if (!record) {
      return res.json({
        has_access: false,
        plan: null,
        status: 'not_found',
        current_period_end: null
      });
    }

    const fields = record.fields || {};
    const status = fields[STATUS_FIELD] || null;
    const plan = fields[PLAN_FIELD] || null;
    const subscriptionEnd = normalizeDate(fields[SUBSCRIPTION_END_FIELD]);
    const now = new Date();

    let hasAccess = false;

    if (subscriptionEnd) {
      hasAccess = new Date(subscriptionEnd).getTime() >= now.getTime();
    }

    if (!hasAccess && status) {
      hasAccess = String(status).toLowerCase() === 'active';
    }

    return res.json({
      has_access: hasAccess,
      plan,
      status,
      current_period_end: subscriptionEnd,
      record_id: record.id
    });
  })
);

router.post(
  '/check-email',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    const record = await airtableService.findRecordByEmail(email);

    return res.json({
      exists: Boolean(record),
      record: airtableService.mapRecord(record)
    });
  })
);

router.post(
  '/create-record',
  asyncHandler(async (req, res) => {
    const { email, fields = {} } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    const existingRecord = await airtableService.findRecordByEmail(email);

    if (existingRecord) {
      res.status(409);
      throw new Error('A record with this email already exists');
    }

    const recordFields = {
      ...fields,
      [EMAIL_FIELD]: email
    };

    const createdRecord = await airtableService.createRecord(recordFields);

    res.status(201).json({
      record: airtableService.mapRecord(createdRecord)
    });
  })
);

router.post(
  '/update-subscription',
  asyncHandler(async (req, res) => {
    const {
      email,
      recordId,
      plan,
      status,
      subscriptionStart,
      subscriptionEnd,
      fields = {}
    } = req.body;

    if (!recordId && !email) {
      res.status(400);
      throw new Error('Either recordId or email is required');
    }

    let record = null;

    if (recordId) {
      try {
        record = await airtableService.getRecordById(recordId);
      } catch (error) {
        if (error.statusCode === 404) {
          record = null;
        } else {
          throw error;
        }
      }
    }

    if (!record && email) {
      record = await airtableService.findRecordByEmail(email);
    }

    if (!record) {
      res.status(404);
      throw new Error('Record not found');
    }

    const updateFields = {
      ...fields,
      ...airtableService.buildSubscriptionFields({
        plan,
        status,
        subscriptionStart,
        subscriptionEnd
      })
    };

    if (Object.keys(updateFields).length === 0) {
      res.status(400);
      throw new Error('No fields provided to update');
    }

    const updatedRecord = await airtableService.updateRecord(record.id, updateFields);

    return res.json({
      record: airtableService.mapRecord(updatedRecord)
    });
  })
);

router.post(
  '/start-subscription',
  asyncHandler(async (req, res) => {
    const {
      email,
      plan,
      status = 'active',
      subscriptionStart = new Date().toISOString(),
      subscriptionEnd,
      fields = {}
    } = req.body;

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    let record = await airtableService.findRecordByEmail(email);

    const subscriptionFields = airtableService.buildSubscriptionFields({
      plan,
      status,
      subscriptionStart,
      subscriptionEnd
    });

    const baseFields = {
      ...fields,
      ...subscriptionFields
    };

    if (!record) {
      const createdRecord = await airtableService.createRecord({
        ...baseFields,
        [EMAIL_FIELD]: email
      });

      return res.status(201).json({
        created: true,
        record: airtableService.mapRecord(createdRecord)
      });
    }

    const updatedRecord = await airtableService.updateRecord(record.id, baseFields);

    return res.json({
      created: false,
      record: airtableService.mapRecord(updatedRecord)
    });
  })
);

module.exports = router;
