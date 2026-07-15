import { evaluate } from '@healthy-companion/safety-rules';
import type { EmergencyBlock } from '@healthy-companion/types';
import { PostMessageRequestSchema } from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors.js';

/**
 * Server-authoritative Safety Gate check.
 *
 * This is the deterministic red-flag evaluation that MUST run before any LLM/medical
 * call (see docs/02 §2.6, docs/07). In M0 it is exposed directly so the gate is testable
 * and usable end-to-end; in M3 it becomes the first step inside
 * POST /v1/conversations/:id/messages.
 *
 * NOTE: intentionally unauthenticated-agnostic and side-effect-free here — auth +
 * audit logging wrap it in M1/M3. It never returns an error for emergencies; it returns
 * a 200 with an `emergency` block the client must render full-screen.
 */
export async function registerSafetyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/safety/check', async (req, reply) => {
    const parsed = PostMessageRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid request', parsed.error.flatten().fieldErrors);
    }

    const result = evaluate(parsed.data.content);

    const emergency: EmergencyBlock | null = result.primary
      ? {
          severity: 'emergency',
          category: result.primary.category,
          message: result.primary.message,
          actions: result.primary.actions,
        }
      : null;

    // Deliberately log only the decision + rule ids — never the message content (PHI).
    req.log.info(
      { escalate: result.escalate, ruleIds: result.matches.map((m) => m.ruleId) },
      'safety_check',
    );

    return reply.status(200).send({ escalate: result.escalate, emergency });
  });
}
