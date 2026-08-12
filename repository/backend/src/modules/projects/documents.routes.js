const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const authenticate = require('../../middleware/auth');
const requireRole = require('../../middleware/rbac');
const upload = require('../../middleware/upload');
const { uploadDocument, listDocuments } = require('./documents.controller');

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  requireRole('student'),
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  asyncHandler(uploadDocument)
);

router.get('/', asyncHandler(listDocuments));

module.exports = router;
