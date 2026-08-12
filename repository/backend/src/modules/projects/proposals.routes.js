const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { createProposal, getProposal } = require('./proposals.controller');

const router = express.Router();

router.use(authenticate);

router.post('/', requireRole('student'), asyncHandler(createProposal));
router.get('/:id', asyncHandler(getProposal));

module.exports = router;
