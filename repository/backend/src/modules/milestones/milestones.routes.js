const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { listMilestones, updateMilestone } = require('./milestones.controller');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get('/', asyncHandler(listMilestones));
router.patch('/:milestoneId', requireRole('supervisor', 'coordinator'), asyncHandler(updateMilestone));

module.exports = router;
