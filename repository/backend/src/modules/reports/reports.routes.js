const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { projectsReport, defenseReport, getStats } = require('./reports.controller');

const router = express.Router();

router.use(authenticate, requireRole('coordinator'));

router.get('/projects', asyncHandler(projectsReport));
router.get('/defense', asyncHandler(defenseReport));
router.get('/stats', asyncHandler(getStats));

module.exports = router;
