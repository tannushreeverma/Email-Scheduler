import type { Email } from '../../types';
import EmailListItem from './EmailListItem';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';
import { Mail, Clock, Send, Ban, AlertTriangle } from 'lucide-react';

interface EmailListProps {
  emails: Email[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  onEmailClick: (email: Email) => void;
}

export default function EmailList({
  emails,
  isLoading,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onEmailClick,
}: EmailListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {emails.map((email) => (
        <EmailListItem
          key={email.id}
          email={email}
          onClick={onEmailClick}
        />
      ))}
    </div>
  );
}

// Convenience wrappers
export function ScheduledEmailList({
  emails,
  isLoading,
  onEmailClick,
}: Omit<EmailListProps, 'emptyTitle' | 'emptyDescription' | 'emptyIcon'>) {
  return (
    <EmailList
      emails={emails}
      isLoading={isLoading}
      emptyTitle="No scheduled emails"
      emptyDescription="Schedule your first email to get started"
      emptyIcon={<Clock className="w-16 h-16 text-gray-300" />}
      onEmailClick={onEmailClick}
    />
  );
}

export function SentEmailList({
  emails,
  isLoading,
  onEmailClick,
}: Omit<EmailListProps, 'emptyTitle' | 'emptyDescription' | 'emptyIcon'>) {
  return (
    <EmailList
      emails={emails}
      isLoading={isLoading}
      emptyTitle="No sent emails"
      emptyDescription="Emails that have been sent will appear here"
      emptyIcon={<Send className="w-16 h-16 text-gray-300" />}
      onEmailClick={onEmailClick}
    />
  );
}

export function CancelledEmailList({
  emails,
  isLoading,
  onEmailClick,
}: Omit<EmailListProps, 'emptyTitle' | 'emptyDescription' | 'emptyIcon'>) {
  return (
    <EmailList
      emails={emails}
      isLoading={isLoading}
      emptyTitle="No cancelled emails"
      emptyDescription="Emails that have been cancelled will appear here"
      emptyIcon={<Ban className="w-16 h-16 text-gray-300" />}
      onEmailClick={onEmailClick}
    />
  );
}

export function FailedEmailList({
  emails,
  isLoading,
  onEmailClick,
}: Omit<EmailListProps, 'emptyTitle' | 'emptyDescription' | 'emptyIcon'>) {
  return (
    <EmailList
      emails={emails}
      isLoading={isLoading}
      emptyTitle="No failed emails"
      emptyDescription="Emails that failed to send will appear here"
      emptyIcon={<AlertTriangle className="w-16 h-16 text-gray-300" />}
      onEmailClick={onEmailClick}
    />
  );
}
