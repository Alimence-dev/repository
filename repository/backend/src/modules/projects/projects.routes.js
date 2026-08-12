const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const documentsRouter = require('./documents.routes');
const milestonesRouter = require('../milestones/milestones.routes');
const feedbackRouter = require('../feedback/feedback.routes');
const { listProjects, getProjectById, updateStage, predictProjectDeadline } = require('./projects.controller');

const router = express.Router();

router.get('/', authenticate, requireRole('student', 'supervisor', 'coordinator'), asyncHandler(listProjects));
router.get('/:id', authenticate, asyncHandler(getProjectById));
router.patch('/:id/stage', authenticate, requireRole('supervisor', 'coordinator'), asyncHandler(updateStage));
router.post(
  '/:id/predict-deadline',
  authenticate,
  requireRole('supervisor', 'coordinator'),
  asyncHandler(predictProjectDeadline)
);

router.use('/:id/documents', documentsRouter);
router.use('/:id/milestones', milestonesRouter);
router.use('/:id/feedback', feedbackRouter);

module.exports = router;
