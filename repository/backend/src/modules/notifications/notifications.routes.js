const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const { listNotifications, markRead } = require('./notifications.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(listNotifications));
router.patch('/:id/read', asyncHandler(markRead));

module.exports = router;
