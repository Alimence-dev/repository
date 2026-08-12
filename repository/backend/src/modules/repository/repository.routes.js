const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const { archiveProject, searchRepository } = require('./repository.controller');

const router = express.Router();

router.use(authenticate);

router.post('/archive/:projectId', requireRole('coordinator'), asyncHandler(archiveProject));
router.get('/search', asyncHandler(searchRepository));

module.exports = router;
