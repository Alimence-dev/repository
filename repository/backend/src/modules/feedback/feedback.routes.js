const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { addFeedback, listFeedback } = require('./feedback.controller');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.post('/', requireRole('supervisor', 'coordinator'), asyncHandler(addFeedback));
router.get('/', asyncHandler(listFeedback));

module.exports = router;
