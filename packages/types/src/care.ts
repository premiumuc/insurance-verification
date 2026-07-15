import { z } from 'zod';
import { IdSchema, TimestampSchema } from './common.js';

/** A daily medication/supplement schedule: reminder times in the user's local HH:MM. */
export const MedScheduleSchema = z.object({
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).min(1).max(12),
  frequency: z.enum(['daily']).default('daily'),
});
export type MedSchedule = z.infer<typeof MedScheduleSchema>;

export const MedicationSchema = z.object({
  id: IdSchema,
  name: z.string(),
  dosage: z.string().nullable(),
  form: z.string().nullable(),
  isSupplement: z.boolean(),
  schedule: MedScheduleSchema,
  active: z.boolean(),
  conditionTag: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: TimestampSchema,
});
export type Medication = z.infer<typeof MedicationSchema>;

export const CreateMedicationSchema = z.object({
  name: z.string().min(1).max(200),
  dosage: z.string().max(100).optional(),
  form: z.string().max(60).optional(),
  isSupplement: z.boolean().default(false),
  schedule: MedScheduleSchema,
  conditionTag: z.string().max(60).optional(),
  notes: z.string().max(500).optional(),
});
export type CreateMedication = z.infer<typeof CreateMedicationSchema>;

export const ReminderStatusSchema = z.enum(['pending', 'taken', 'skipped', 'missed']);
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>;

export const MedReminderSchema = z.object({
  id: IdSchema,
  medicationId: IdSchema,
  medicationName: z.string(),
  scheduledAt: TimestampSchema,
  status: ReminderStatusSchema,
  respondedAt: TimestampSchema.nullable(),
});
export type MedReminder = z.infer<typeof MedReminderSchema>;

export const RespondReminderSchema = z.object({
  status: z.enum(['taken', 'skipped']),
});
export type RespondReminder = z.infer<typeof RespondReminderSchema>;

// --- Appointments ---
export const AppointmentStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);

export const AppointmentSchema = z.object({
  id: IdSchema,
  title: z.string(),
  providerName: z.string().nullable(),
  startsAt: TimestampSchema,
  location: z.string().nullable(),
  status: AppointmentStatusSchema,
  notes: z.string().nullable(),
  createdAt: TimestampSchema,
});
export type Appointment = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentSchema = z.object({
  title: z.string().min(1).max(200),
  providerName: z.string().max(200).optional(),
  startsAt: TimestampSchema,
  location: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
});
export type CreateAppointment = z.infer<typeof CreateAppointmentSchema>;

/** "Prep for your visit" export (docs/04). Non-clinical summary the user can share. */
export const VisitSummarySchema = z.object({
  appointment: AppointmentSchema,
  generatedAt: TimestampSchema,
  recentSymptoms: z.array(z.object({ label: z.string(), lastSeen: TimestampSchema, count: z.number() })),
  activeMedications: z.array(z.object({ name: z.string(), dosage: z.string().nullable() })),
  notableMetrics: z.array(z.object({ label: z.string(), value: z.string() })),
});
export type VisitSummary = z.infer<typeof VisitSummarySchema>;
