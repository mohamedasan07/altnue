import { getHealth } from '../services/health.service.js';

/** GET /api/health */
export function health(_req, res) {
  res.status(200).json(getHealth());
}