const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { listTopics, createTopic, checkDuplicateForTopic, suggestTopics } = require('./topics.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(listTopics));
router.post('/', requireRole('student', 'coordinator'), asyncHandler(createTopic));
router.post('/suggest', requireRole('student'), asyncHandler(suggestTopics));
router.post('/:id/check-duplicate', requireRole('coordinator'), asyncHandler(checkDuplicateForTopic));

module.exports = router;
