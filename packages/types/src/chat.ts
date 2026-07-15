import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

/** Detected intent for a conversational turn (see docs/07). */
export const MessageIntentSchema = z.enum(['log', 'ask', 'both', 'emergency']);
export type MessageIntent = z.infer<typeof MessageIntentSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/** Emergency block the client MUST render full-screen when present. */
export const EmergencyBlockSchema = z.object({
  severity: z.literal('emergency'),
  category: z.string(),
  message: z.string(),
  actions: z.array(
    z.enum(['call_911', 'find_nearest_er', 'call_988', 'call_poison_control', 'seek_urgent_care']),
  ),
});
export type EmergencyBlock = z.infer<typeof EmergencyBlockSchema>;

export const PostMessageRequestSchema = z.object({
  content: z.string().min(1).max(4000),
});
export type PostMessageRequest = z.infer<typeof PostMessageRequestSchema>;

export const MessageSchema = z.object({
  id: IdSchema,
  role: MessageRoleSchema,
  content: z.string(),
  intent: MessageIntentSchema.nullable(),
  createdAt: TimestampSchema,
});
export type Message = z.infer<typeof MessageSchema>;

/** Response to posting a user message: the reply plus structured side-effects. */
export const PostMessageResponseSchema = z.object({
  message: MessageSchema,
  createdEventIds: z.array(IdSchema),
  assessmentId: IdSchema.nullable(),
  emergency: EmergencyBlockSchema.nullable(),
});
export type PostMessageResponse = z.infer<typeof PostMessageResponseSchema>;
