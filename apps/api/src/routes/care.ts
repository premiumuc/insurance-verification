import {
  CreateAppointmentSchema,
  CreateMedicationSchema,
  RespondReminderSchema,
} from '@healthy-companion/types';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const DateQuery = z.object({ date: z.string().date().optional() });

/** Medications, reminders, appointments, and the visit-summary export. */
export async function registerCareRoutes(app: FastifyInstance): Promise<void> {
  const { ctx } = app;
  const audit = (req: { ip: string; headers: Record<string, unknown> }, userId: string, action: 'read' | 'create' | 'update' | 'delete' | 'export', resourceType: string, purpose: string, resourceId?: string) =>
    ctx.audit.record({
      actorUserId: userId,
      subjectUserId: userId,
      action,
      resourceType,
      resourceId: resourceId ?? null,
      purpose,
      ip: req.ip,
      userAgent: (req.headers['user-agent'] as string) ?? null,
    });

  // --- Medications ---
  app.post('/medications', { preHandler: app.authenticate }, async (req, reply) => {
    const input = CreateMedicationSchema.parse(req.body);
    const med = await ctx.care.createMedication(req.user!.id, input);
    await audit(req, req.user!.id, 'create', 'medication', 'add_medication', med.id);
    return reply.status(201).send(med);
  });

  app.get('/medications', { preHandler: app.authenticate }, async (req) => {
    return ctx.care.listMedications(req.user!.id);
  });

  app.delete('/medications/:id', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const med = await ctx.care.deactivateMedication(req.user!.id, id);
    await audit(req, req.user!.id, 'update', 'medication', 'deactivate_medication', id);
    return med;
  });

  // --- Reminders ---
  app.get('/medications/reminders', { preHandler: app.authenticate }, async (req) => {
    const { date } = DateQuery.parse(req.query);
    const dateISO = date ?? new Date().toISOString().slice(0, 10);
    return ctx.care.remindersForDay(req.user!.id, dateISO);
  });

  app.post('/medications/reminders/:id/respond', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const { status } = RespondReminderSchema.parse(req.body);
    const reminder = await ctx.care.respondReminder(req.user!.id, id, status);
    await audit(req, req.user!.id, 'update', 'med_reminder', `reminder_${status}`, id);
    return reminder;
  });

  // --- Appointments ---
  app.post('/appointments', { preHandler: app.authenticate }, async (req, reply) => {
    const input = CreateAppointmentSchema.parse(req.body);
    const appt = await ctx.care.createAppointment(req.user!.id, input);
    await audit(req, req.user!.id, 'create', 'appointment', 'add_appointment', appt.id);
    return reply.status(201).send(appt);
  });

  app.get('/appointments', { preHandler: app.authenticate }, async (req) => {
    return ctx.care.listAppointments(req.user!.id);
  });

  app.delete('/appointments/:id', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const appt = await ctx.care.cancelAppointment(req.user!.id, id);
    await audit(req, req.user!.id, 'update', 'appointment', 'cancel_appointment', id);
    return appt;
  });

  app.get('/appointments/:id/visit-summary', { preHandler: app.authenticate }, async (req) => {
    const { id } = req.params as { id: string };
    const summary = await ctx.care.visitSummary(req.user!.id, id);
    // Producing a shareable clinical-context export is an auditable event.
    await audit(req, req.user!.id, 'export', 'visit_summary', 'export_visit_summary', id);
    return summary;
  });
}
