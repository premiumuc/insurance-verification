import { z } from 'zod';
import { TimestampSchema } from './common.js';

/** Demographic + medical context (see docs/03 §3.2). This is the context the
 * self-diagnosis engine reads. All fields optional past onboarding minimums. */
export const SexAtBirthSchema = z.enum(['female', 'male', 'intersex', 'unknown']);

export const ProfileSchema = z.object({
  firstName: z.string().min(1).max(100).nullable(),
  lastName: z.string().min(1).max(100).nullable(),
  dateOfBirth: z.string().date().nullable(), // YYYY-MM-DD
  sexAtBirth: SexAtBirthSchema.nullable(),
  genderIdentity: z.string().max(100).nullable(),
  heightCm: z.number().positive().max(300).nullable(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).nullable(),
  conditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  pregnancyStatus: z.enum(['not_pregnant', 'pregnant', 'unknown', 'not_applicable']).nullable(),
  locale: z.string().default('en-US'),
  updatedAt: TimestampSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Partial update — every field optional; server merges. */
export const UpdateProfileSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    dateOfBirth: z.string().date(),
    sexAtBirth: SexAtBirthSchema,
    genderIdentity: z.string().max(100),
    heightCm: z.number().positive().max(300),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']),
    conditions: z.array(z.string().min(1)).max(100),
    allergies: z.array(z.string().min(1)).max(100),
    pregnancyStatus: z.enum(['not_pregnant', 'pregnant', 'unknown', 'not_applicable']),
    locale: z.string().min(2).max(10),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
