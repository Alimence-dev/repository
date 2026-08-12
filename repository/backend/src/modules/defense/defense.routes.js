const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { scheduleDefense, listDefenses, getDefense, recordResult } = require('./defense.controller');

const router = express.Router();

router.use(authenticate);

router.post('/schedule', requireRole('coordinator'), asyncHandler(scheduleDefense));
router.get('/', requireRole('coordinator'), asyncHandler(listDefenses));
router.get('/:projectId', asyncHandler(getDefense));
router.patch('/:id/result', requireRole('coordinator'), asyncHandler(recordResult));

module.exports = router;
