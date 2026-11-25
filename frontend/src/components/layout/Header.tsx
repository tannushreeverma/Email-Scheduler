import { Filter, RefreshCw } from 'lucide-react';
import SearchBar from '../ui/SearchBar';

interface HeaderProps {
  onSearch: (query: string) => void;
  onRefresh?: () => void;
}

export default function Header({ onSearch, onRefresh }: HeaderProps) {
  return (
    <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 bg-white">
      <SearchBar
        placeholder="Search"
        onSearch={onSearch}
        className="flex-1 max-w-lg"
      />
      <button
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        title="Filter"
      >
        <Filter className="h-4 w-4" />
      </button>
      <button
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        onClick={onRefresh}
        title="Refresh"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}
