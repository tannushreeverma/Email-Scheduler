import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
  debounceMs?: number;
}

export default function SearchBar({
  placeholder = 'Search',
  onSearch,
  className = '',
  debounceMs = 300,
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm
          text-gray-900 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-[#34A853] focus:border-transparent
          transition-colors duration-200 bg-white"
      />
    </div>
  );
}
