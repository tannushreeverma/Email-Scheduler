import type { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'scheduled' | 'sent' | 'failed' | 'default';
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  scheduled: 'bg-orange-100 text-orange-700 border-orange-200',
  sent: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
