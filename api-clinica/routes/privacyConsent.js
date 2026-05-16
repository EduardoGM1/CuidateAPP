import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middlewares/auth.js';
import { generalRateLimit } from '../middlewares/rateLimiting.js';
import {
  getPrivacyConsentStatus,
  postPrivacyConsent,
} from '../controllers/privacyConsentController.js';

const router = Router();

router.use(authenticateToken);
router.use(generalRateLimit);

const validateConsentBody = [
  body('version')
    .optional()
    .isString()
    .isLength({ min: 1, max: 20 }),
  body('privacyNotice')
    .isBoolean()
    .withMessage('privacyNotice debe ser booleano'),
  body('healthData')
    .isBoolean()
    .withMessage('healthData debe ser booleano'),
  body('canal')
    .optional()
    .isIn(['web', 'mobile']),
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Datos inválidos', details: errors.array() });
  }
  next();
}

router.get('/status', getPrivacyConsentStatus);
router.post('/', validateConsentBody, handleValidation, postPrivacyConsent);

export default router;
