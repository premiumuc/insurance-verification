import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateHealthEvent } from '@healthy-companion/types';
import { api } from '@/lib/api';

const keys = {
  summary: (date?: string) => ['summary', date ?? 'today'] as const,
  patterns: (w: number) => ['patterns', w] as const,
  events: (type?: string) => ['events', type ?? 'all'] as const,
};

export function useDailySummary(date?: string) {
  return useQuery({ queryKey: keys.summary(date), queryFn: () => api.dailySummary(date) });
}

export function usePatterns(windowDays = 14) {
  return useQuery({ queryKey: keys.patterns(windowDays), queryFn: () => api.patterns(windowDays) });
}

export function useRecentEvents() {
  return useQuery({ queryKey: keys.events(), queryFn: () => api.listEvents({ limit: 25 }) });
}

/** Logging mutation that refreshes the dashboard/summary/patterns on success. */
export function useLogEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHealthEvent) => api.createEvent(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['summary'] });
      void qc.invalidateQueries({ queryKey: ['events'] });
      void qc.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}
