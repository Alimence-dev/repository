const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { getMe, listUsers, createUser, updateRole, updateStatus, getAuditLogs } = require('./users.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', asyncHandler(getMe));
router.post('/', requireRole('admin'), asyncHandler(createUser));
router.get('/', requireRole('admin'), asyncHandler(listUsers));
router.get('/audit', requireRole('admin'), asyncHandler(getAuditLogs));
router.patch('/:id/role', requireRole('admin'), asyncHandler(updateRole));
router.patch('/:id/status', requireRole('admin'), asyncHandler(updateStatus));

module.exports = router;
