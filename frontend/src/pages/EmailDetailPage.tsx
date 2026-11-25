import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Archive, Trash2 } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { emailApi } from '../services/api';
import type { Email } from '../types';

export default function EmailDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    emailApi
      .getEmailById(id)
      .then((res) => setEmail(res.data))
      .catch(() => setEmail(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Email not found</p>
      </div>
    );
  }

  const senderName = email.from.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-3 text-gray-900 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-lg font-medium">{email.subject}</span>
        </button>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-yellow-500 transition-colors cursor-pointer">
            <Star className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <Archive className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
            <Trash2 className="h-5 w-5" />
          </button>
          <Avatar name={senderName} size="md" />
        </div>
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Sender Info */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-3">
            <Avatar name={senderName} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{senderName}</span>
                <span className="text-sm text-gray-500">&lt;{email.from}&gt;</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">to {email.to}</p>
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {email.sentAt
              ? new Date(email.sentAt).toLocaleString()
              : new Date(email.scheduledAt).toLocaleString()}
          </span>
        </div>

        {/* Body */}
        <div
          className="prose prose-sm max-w-none text-gray-800"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
      </div>
    </div>
  );
}
