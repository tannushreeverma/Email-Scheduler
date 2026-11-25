import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import { SentEmailList } from '../components/email/EmailList';
import type { Email } from '../types';
import { emailApi } from '../services/api';

export default function SentPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [emails, setEmails] = useState<Email[]>([]);

  const fetchEmails = useCallback(async (search?: string) => {
    setIsLoading(true);
    try {
      const response = await emailApi.getSentEmails(1, 50, search);
      setEmails(response.data.items);
    } catch (error) {
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
      <SentEmailList
        emails={emails}
        isLoading={isLoading}
        onEmailClick={handleEmailClick}
      />
    </>
  );
}
