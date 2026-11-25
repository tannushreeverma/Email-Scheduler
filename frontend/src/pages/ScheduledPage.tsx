import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { ScheduledEmailList } from '../components/email/EmailList';
import type { Email } from '../types';
import { emailApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ScheduledPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [emails, setEmails] = useState<Email[]>([]);

  const fetchEmails = useCallback(async (search?: string) => {
    setIsLoading(true);
    try {
      const response = await emailApi.getScheduledEmails(1, 50, search);
      setEmails(response.data.items);
    } catch (error) {
      // If API not available, show empty state (dev mode)
      setEmails([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails(searchQuery || undefined);
  }, [fetchEmails, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleEmailClick = (email: Email) => {
    navigate(`/email/${email.id}`);
  };

  return (
    <>
      <Header onSearch={handleSearch} onRefresh={() => fetchEmails(searchQuery || undefined)} />
      <ScheduledEmailList
        emails={emails}
        isLoading={isLoading}
        onEmailClick={handleEmailClick}
      />
    </>
  );
}
