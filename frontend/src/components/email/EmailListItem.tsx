import { Star } from 'lucide-react';
import Badge from '../ui/Badge';
import type { Email } from '../../types';
import { format } from 'date-fns';

interface EmailListItemProps {
  email: Email;
  onClick: (email: Email) => void;
}

export default function EmailListItem({ email, onClick }: EmailListItemProps) {
  const isScheduled = email.status === 'scheduled';
  const displayTime = isScheduled
    ? email.scheduledAt
    : email.sentAt || email.scheduledAt;

  const formattedTime = (() => {
    try {
      const date = new Date(displayTime);
      const dayPrefix = format(date, 'EEE');
      const time = format(date, 'h:mm:ss a');
      return `${dayPrefix} ${time}`;
    } catch {
      return displayTime;
    }
  })();

  const badgeVariant = email.status === 'sent' ? 'sent' : email.status === 'failed' ? 'failed' : 'scheduled';

  const badgeLabel = isScheduled
    ? `⏱ ${formattedTime}`
    : email.status === 'sent'
    ? 'Sent'
    : 'Failed';

  return (
    <div
      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors group"
      onClick={() => onClick(email)}
    >
      {/* Recipient */}
      <div className="w-[180px] flex-shrink-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          To: {email.to.split('@')[0].replace(/^\w/, (c) => c.toUpperCase())}
        </p>
      </div>

      {/* Badge */}
      <div className="flex-shrink-0">
        <Badge variant={badgeVariant}>
          {badgeLabel}
        </Badge>
      </div>

      {/* Subject & Preview */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">
          <span className="font-medium">{email.subject}</span>
          {email.body && (
            <span className="text-gray-500">
              {' '}- {email.body.replace(/<[^>]*>/g, '').slice(0, 60)}...
            </span>
          )}
        </p>
      </div>

      {/* Star */}
      <button
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-yellow-400 transition-all cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Star className="h-4 w-4" />
      </button>
    </div>
  );
}
