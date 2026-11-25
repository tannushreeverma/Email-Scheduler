import { X } from 'lucide-react';

interface EmailChipProps {
  email: string;
  onRemove?: (email: string) => void;
  className?: string;
}

export default function EmailChip({ email, onRemove, className = '' }: EmailChipProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-3 py-1 rounded-full
        bg-[#34A853] text-white text-sm font-medium
        ${className}
      `}
    >
      {email}
      {onRemove && (
        <button
          onClick={() => onRemove(email)}
          className="hover:bg-green-700 rounded-full p-0.5 transition-colors cursor-pointer"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

interface EmailChipListProps {
  emails: string[];
  maxVisible?: number;
  onRemove?: (email: string) => void;
}

export function EmailChipList({ emails, maxVisible = 3, onRemove }: EmailChipListProps) {
  const visibleEmails = emails.slice(0, maxVisible);
  const remaining = emails.length - maxVisible;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visibleEmails.map((email) => (
        <EmailChip key={email} email={email} onRemove={onRemove} />
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#34A853] text-white text-sm font-medium">
          +{remaining}
        </span>
      )}
    </div>
  );
}
