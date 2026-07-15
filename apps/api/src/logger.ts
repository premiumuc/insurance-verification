import type { PinoLoggerOptions } from 'fastify/types/logger.js';

/**
 * PHI-safe logger options for Fastify.
 *
 * HIPAA requires that PHI never lands in logs. We (1) redact known sensitive paths and
 * (2) keep request logging to non-PHI metadata only. Route handlers must never log
 * request bodies or health content. See docs/06.
 *
 * We return options (not a constructed instance) so Fastify owns the pino lifecycle and
 * child-logger wiring.
 */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body',
  'res.body',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.email',
  '*.phone',
  '*.dateOfBirth',
  '*.content',
  '*.data',
];

export function createLoggerOptions(level: string): PinoLoggerOptions {
  return {
    level,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    serializers: {
      req(req: { method?: string; url?: string; id?: string }) {
        return { method: req.method, url: req.url, id: req.id };
      },
      res(res: { statusCode?: number }) {
        return { statusCode: res.statusCode };
      },
    },
  };
}
