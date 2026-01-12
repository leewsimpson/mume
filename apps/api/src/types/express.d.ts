import 'express';
import type { Logger } from '../services/github.service.js';

declare global {
  namespace Express {
    interface Request {
      logger?: Logger;
    }
  }
}
