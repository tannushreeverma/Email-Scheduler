import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailApi } from '../services/api';
import type { ScheduleEmailRequest } from '../types';
import toast from 'react-hot-toast';

export function useScheduledEmails(page = 1, pageSize = 20, search?: string) {
  return useQuery({
    queryKey: ['emails', 'scheduled', page, pageSize, search],
    queryFn: () => emailApi.getScheduledEmails(page, pageSize, search),
    select: (res) => res.data,
  });
}

export function useSentEmails(page = 1, pageSize = 20, search?: string) {
  return useQuery({
    queryKey: ['emails', 'sent', page, pageSize, search],
    queryFn: () => emailApi.getSentEmails(page, pageSize, search),
    select: (res) => res.data,
  });
}

export function useEmailDetail(id: string) {
  return useQuery({
    queryKey: ['emails', id],
    queryFn: () => emailApi.getEmailById(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useScheduleEmails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ScheduleEmailRequest) => emailApi.scheduleEmails(payload),
    onSuccess: (data) => {
      toast.success(data.message || 'Emails scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to schedule emails');
    },
  });
}

export function useCancelEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => emailApi.cancelScheduledEmail(id),
    onSuccess: () => {
      toast.success('Email cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel email');
    },
  });
}

export function useCancelledEmails(page = 1, pageSize = 20, search?: string) {
  return useQuery({
    queryKey: ['emails', 'cancelled', page, pageSize, search],
    queryFn: () => emailApi.getCancelledEmails(page, pageSize, search),
    select: (res) => res.data,
  });
}

export function useFailedEmails(page = 1, pageSize = 20, search?: string) {
  return useQuery({
    queryKey: ['emails', 'failed', page, pageSize, search],
    queryFn: () => emailApi.getFailedEmails(page, pageSize, search),
    select: (res) => res.data,
  });
}

export function useEmailCounts() {
  return useQuery({
    queryKey: ['emails', 'counts'],
    queryFn: () => emailApi.getEmailCounts(),
    select: (res) => res.data,
    refetchInterval: 30_000,
  });
}

export function useSearchEmails(query: string) {
  return useQuery({
    queryKey: ['emails', 'search', query],
    queryFn: () => emailApi.searchEmails(query),
    select: (res) => res.data,
    enabled: query.length > 0,
  });
}

export function useUploadLeads() {
  return useMutation({
    mutationFn: (file: File) => emailApi.uploadLeadsList(file),
    onSuccess: (data) => {
      toast.success(`${data.data.count} email addresses detected`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload leads file');
    },
  });
}
