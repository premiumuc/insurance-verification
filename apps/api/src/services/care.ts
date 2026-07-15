import { randomUUID } from 'node:crypto';
import type {
  Appointment,
  CreateAppointment,
  CreateMedication,
  Medication,
  MedReminder,
  VisitSummary,
} from '@healthy-companion/types';
import type {
  AppointmentRecord,
  MedicationRecord,
  ReminderRecord,
} from '../db/models.js';
import type {
  AppointmentRepository,
  EventRepository,
  MedicationRepository,
  ReminderRepository,
} from '../db/repositories.js';
import { AppError } from '../errors.js';

function medToDto(m: MedicationRecord): Medication {
  const { userId: _u, ...rest } = m;
  return rest;
}
function apptToDto(a: AppointmentRecord): Appointment {
  const { userId: _u, ...rest } = a;
  return rest;
}

/**
 * Generate reminder instances for a medication on a given local calendar date.
 * A worker runs this daily in production (docs/03 §3.4); here it's a pure function the
 * service calls when a medication is created and when today's reminders are requested.
 */
export function generateReminders(med: MedicationRecord, dateISO: string): ReminderRecord[] {
  if (!med.active) return [];
  return med.schedule.times.map((hhmm) => ({
    id: randomUUID(),
    userId: med.userId,
    medicationId: med.id,
    scheduledAt: new Date(`${dateISO}T${hhmm}:00.000Z`).toISOString(),
    status: 'pending' as const,
    respondedAt: null,
  }));
}

/** Medications, reminders, and appointments (docs/04). */
export class CareService {
  constructor(
    private readonly meds: MedicationRepository,
    private readonly reminders: ReminderRepository,
    private readonly appts: AppointmentRepository,
    private readonly events: EventRepository,
  ) {}

  // --- Medications ---
  async createMedication(userId: string, input: CreateMedication): Promise<Medication> {
    const record: MedicationRecord = {
      id: randomUUID(),
      userId,
      name: input.name,
      dosage: input.dosage ?? null,
      form: input.form ?? null,
      isSupplement: input.isSupplement,
      schedule: input.schedule,
      active: true,
      conditionTag: input.conditionTag ?? null,
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
    };
    await this.meds.create(record);
    // Seed today's reminders immediately so the user sees them.
    const today = new Date().toISOString().slice(0, 10);
    await this.reminders.createMany(generateReminders(record, today));
    return medToDto(record);
  }

  async listMedications(userId: string): Promise<Medication[]> {
    return (await this.meds.listByUser(userId)).map(medToDto);
  }

  async deactivateMedication(userId: string, id: string): Promise<Medication> {
    const med = await this.meds.findById(id);
    if (!med) throw AppError.notFound('Medication not found');
    if (med.userId !== userId) throw AppError.forbidden();
    return medToDto(await this.meds.update(id, { active: false }));
  }

  // --- Reminders ---
  async remindersForDay(userId: string, dateISO: string): Promise<MedReminder[]> {
    const from = new Date(`${dateISO}T00:00:00.000Z`).toISOString();
    const to = new Date(`${dateISO}T23:59:59.999Z`).toISOString();
    const [reminders, meds] = await Promise.all([
      this.reminders.listByUser(userId, from, to),
      this.meds.listByUser(userId),
    ]);
    const names = new Map(meds.map((m) => [m.id, m.name]));
    return reminders.map((r) => ({
      id: r.id,
      medicationId: r.medicationId,
      medicationName: names.get(r.medicationId) ?? 'Medication',
      scheduledAt: r.scheduledAt,
      status: r.status,
      respondedAt: r.respondedAt,
    }));
  }

  async respondReminder(userId: string, id: string, status: 'taken' | 'skipped'): Promise<MedReminder> {
    const reminder = await this.reminders.findById(id);
    if (!reminder) throw AppError.notFound('Reminder not found');
    if (reminder.userId !== userId) throw AppError.forbidden();
    const updated = await this.reminders.update(id, { status, respondedAt: new Date().toISOString() });
    const med = await this.meds.findById(updated.medicationId);
    return {
      id: updated.id,
      medicationId: updated.medicationId,
      medicationName: med?.name ?? 'Medication',
      scheduledAt: updated.scheduledAt,
      status: updated.status,
      respondedAt: updated.respondedAt,
    };
  }

  // --- Appointments ---
  async createAppointment(userId: string, input: CreateAppointment): Promise<Appointment> {
    const record: AppointmentRecord = {
      id: randomUUID(),
      userId,
      title: input.title,
      providerName: input.providerName ?? null,
      startsAt: input.startsAt,
      location: input.location ?? null,
      status: 'scheduled',
      notes: input.notes ?? null,
      createdAt: new Date().toISOString(),
    };
    return apptToDto(await this.appts.create(record));
  }

  async listAppointments(userId: string): Promise<Appointment[]> {
    return (await this.appts.listByUser(userId)).map(apptToDto);
  }

  private async ownedAppt(userId: string, id: string): Promise<AppointmentRecord> {
    const a = await this.appts.findById(id);
    if (!a) throw AppError.notFound('Appointment not found');
    if (a.userId !== userId) throw AppError.forbidden();
    return a;
  }

  async cancelAppointment(userId: string, id: string): Promise<Appointment> {
    await this.ownedAppt(userId, id);
    return apptToDto(await this.appts.update(id, { status: 'cancelled' }));
  }

  /**
   * "Prep for your visit" export — a non-clinical summary of recent symptoms, active
   * meds, and notable metrics the user can bring to a provider (docs/04).
   */
  async visitSummary(userId: string, appointmentId: string): Promise<VisitSummary> {
    const appt = await this.ownedAppt(userId, appointmentId);

    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 30);
    const events = await this.events.listInRange(userId, from.toISOString(), to.toISOString());

    const symptomMap = new Map<string, { lastSeen: string; count: number }>();
    let latestWeight: string | null = null;
    let latestMood: string | null = null;
    for (const e of events) {
      if (e.type === 'symptom') {
        const label = String(e.data.label ?? 'symptom');
        const prev = symptomMap.get(label);
        symptomMap.set(label, {
          lastSeen: prev && prev.lastSeen > e.occurredAt ? prev.lastSeen : e.occurredAt,
          count: (prev?.count ?? 0) + 1,
        });
      }
      if (e.type === 'weight' && !latestWeight) latestWeight = `${e.data.kg} kg`;
      if (e.type === 'mood' && !latestMood) latestMood = `${e.data.score}/10`;
    }

    const meds = await this.meds.listByUser(userId, true);

    const notableMetrics: VisitSummary['notableMetrics'] = [];
    if (latestWeight) notableMetrics.push({ label: 'Latest weight', value: latestWeight });
    if (latestMood) notableMetrics.push({ label: 'Latest mood', value: latestMood });

    return {
      appointment: apptToDto(appt),
      generatedAt: new Date().toISOString(),
      recentSymptoms: [...symptomMap.entries()].map(([label, v]) => ({ label, lastSeen: v.lastSeen, count: v.count })),
      activeMedications: meds.map((m) => ({ name: m.name, dosage: m.dosage })),
      notableMetrics,
    };
  }
}
