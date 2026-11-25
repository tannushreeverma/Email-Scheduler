import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  ChevronDown,
  Upload,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Quote,
  Code,
  Strikethrough,
  Undo,
  Redo,
  Type,
} from 'lucide-react';
import { EmailChipList } from '../components/ui/EmailChip';
import SendLaterDropdown from '../components/email/SendLaterDropdown';
import Button from '../components/ui/Button';
import { emailApi } from '../services/api';
import toast from 'react-hot-toast';

export default function ComposePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [from] = useState('oliver.brown@domain.io');
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetween, setDelayBetween] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('200');
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSendLater, setShowSendLater] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const email = toInput.trim().replace(',', '');
      if (email && email.includes('@') && !toEmails.includes(email)) {
        setToEmails([...toEmails, email]);
        setToInput('');
      }
    }
  };

  const handleRemoveEmail = (email: string) => {
    setToEmails(toEmails.filter((e) => e !== email));
  };

  const handleUploadList = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await emailApi.uploadLeadsList(file);
      const newEmails = response.data.emails;
      const uniqueEmails = [...new Set([...toEmails, ...newEmails])];
      setToEmails(uniqueEmails);
      toast.success(`${response.data.count} email addresses detected`);
    } catch {
      // Fall back to client-side parsing
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const foundEmails = text.match(emailRegex) || [];
        const uniqueEmails = [...new Set([...toEmails, ...foundEmails])];
        setToEmails(uniqueEmails);
        toast.success(`${foundEmails.length} email addresses detected`);
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleSendLaterSelect = (dateTime: string) => {
    setScheduledAt(dateTime);
    setShowSendLater(false);
    toast.success('Send time scheduled');
  };

  const handleSend = async () => {
    if (toEmails.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }
    if (!subject) {
      toast.error('Please add a subject');
      return;
    }

    setIsSending(true);
    try {
      await emailApi.scheduleEmails({
        from,
        to: toEmails,
        subject,
        body,
        scheduledAt: scheduledAt || new Date().toISOString(),
        delayBetweenEmails: parseInt(delayBetween) || 2,
        hourlyLimit: parseInt(hourlyLimit) || 200,
      });
      toast.success(`${toEmails.length} email(s) scheduled successfully!`);
      navigate('/scheduled');
    } catch {
      toast.error('Failed to schedule emails');
    } finally {
      setIsSending(false);
    }
  };

  const toolbarButtons = [
    { icon: Undo, title: 'Undo' },
    { icon: Redo, title: 'Redo' },
    { divider: true },
    { icon: Type, title: 'Font Size', hasDropdown: true },
    { divider: true },
    { icon: Bold, title: 'Bold' },
    { icon: Italic, title: 'Italic' },
    { icon: Underline, title: 'Underline' },
    { divider: true },
    { icon: AlignLeft, title: 'Align Left' },
    { icon: AlignCenter, title: 'Align Center' },
    { icon: AlignRight, title: 'Align Right' },
    { icon: AlignJustify, title: 'Justify' },
    { divider: true },
    { icon: ListOrdered, title: 'Ordered List' },
    { icon: List, title: 'Unordered List' },
    { icon: Outdent, title: 'Decrease Indent' },
    { icon: Indent, title: 'Increase Indent' },
    { divider: true },
    { icon: Quote, title: 'Block Quote' },
    { icon: Code, title: 'Code' },
    { icon: Strikethrough, title: 'Strikethrough' },
  ];

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-900 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-lg font-semibold">Compose New Email</span>
        </button>

        <div className="flex items-center gap-3 relative">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            onClick={() => setShowSendLater(!showSendLater)}
          >
            <Clock className="h-5 w-5" />
          </button>

          {scheduledAt ? (
            <Button
              variant="primary"
              onClick={handleSend}
              isLoading={isSending}
              className="bg-[#34A853] hover:bg-[#2d9249]"
            >
              Send Later
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSend}
              isLoading={isSending}
              className="bg-[#34A853] hover:bg-[#2d9249]"
            >
              Send
            </Button>
          )}

          {showSendLater && (
            <SendLaterDropdown
              onSelect={handleSendLaterSelect}
              onClose={() => setShowSendLater(false)}
            />
          )}
        </div>
      </div>

      {/* Compose Form */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* From */}
        <div className="flex items-center gap-4 py-3 border-b border-gray-100">
          <label className="text-sm text-gray-500 w-16">From</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900 bg-gray-100 px-3 py-1.5 rounded-md">
              {from}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* To */}
        <div className="flex items-center gap-4 py-3 border-b border-gray-100">
          <label className="text-sm text-gray-500 w-16">To</label>
          <div className="flex-1 flex items-center gap-2 flex-wrap">
            {toEmails.length > 0 && (
              <EmailChipList
                emails={toEmails}
                maxVisible={3}
                onRemove={handleRemoveEmail}
              />
            )}
            <input
              type="text"
              placeholder={toEmails.length === 0 ? 'recipient@example.com' : ''}
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              onKeyDown={handleAddEmail}
              className="flex-1 min-w-[200px] text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
          <button
            onClick={handleUploadList}
            className="flex items-center gap-1.5 text-sm text-[#34A853] hover:text-green-700 font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            Upload List
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Subject */}
        <div className="flex items-center gap-4 py-3 border-b border-gray-100">
          <label className="text-sm text-gray-500 w-16">Subject</label>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
        </div>

        {/* Delay & Hourly Limit */}
        <div className="flex items-center gap-6 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Delay between 2 emails</label>
            <input
              type="text"
              value={delayBetween}
              onChange={(e) => setDelayBetween(e.target.value)}
              className="w-16 text-center text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#34A853]"
              placeholder="sec"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">Hourly Limit</label>
            <input
              type="text"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              className="w-16 text-center text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#34A853]"
              placeholder="max"
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 py-3 border-b border-gray-100 flex-wrap">
          {toolbarButtons.map((btn, i) =>
            'divider' in btn ? (
              <div key={i} className="w-px h-5 bg-gray-200 mx-1" />
            ) : (
              <button
                key={i}
                title={btn.title}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              >
                <btn.icon className="h-4 w-4" />
                {'hasDropdown' in btn && <ChevronDown className="h-3 w-3 ml-0.5 inline" />}
              </button>
            )
          )}
        </div>

        {/* Body */}
        <div className="py-4">
          <textarea
            placeholder="Type Your Reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full min-h-[300px] text-sm text-gray-900 placeholder-gray-400 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
