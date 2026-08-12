const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { getRecommendations, createAllocation } = require('./allocations.controller');

const router = express.Router();

router.use(authenticate, requireRole('coordinator'));

router.get('/recommendations', asyncHandler(getRecommendations));
router.post('/', asyncHandler(createAllocation));

module.exports = router;
