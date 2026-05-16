import {
  getConsentStatus,
  recordConsent,
  resolveConsentSubject,
} from '../services/privacyConsentService.js';
import { CURRENT_PRIVACY_NOTICE_VERSION } from '../repositories/privacyConsentRepository.js';

export async function getPrivacyConsentStatus(req, res, next) {
  try {
    const version = req.query.version || CURRENT_PRIVACY_NOTICE_VERSION;
    const status = await getConsentStatus(req.user, version);
    res.json(status);
  } catch (error) {
    next(error);
  }
}

export async function postPrivacyConsent(req, res, next) {
  try {
    if (!resolveConsentSubject(req.user)) {
      return res.status(403).json({
        error: 'Solo pacientes y doctores pueden registrar este consentimiento',
      });
    }

    const canalHeader = (req.headers['x-client-type'] || '').toString().toLowerCase();
    const canal =
      req.body.canal === 'mobile' || canalHeader === 'mobile' ? 'mobile' : 'web';

    const result = await recordConsent(req.user, {
      version: req.body.version,
      privacyNotice: req.body.privacyNotice,
      healthData: req.body.healthData,
      canal,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
}
