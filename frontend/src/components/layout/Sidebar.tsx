import { NavLink, useNavigate } from 'react-router-dom';
import { Clock, Send, Ban, AlertTriangle, ChevronDown } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useEmailCounts } from '../../hooks/useEmails';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: counts } = useEmailCounts();

  const navItems = [
    {
      label: 'Scheduled',
      icon: Clock,
      path: '/scheduled',
      count: counts?.scheduled,
    },
    {
      label: 'Sent',
      icon: Send,
      path: '/sent',
      count: counts?.sent,
    },
    {
      label: 'Cancelled',
      icon: Ban,
      path: '/cancelled',
      count: counts?.cancelled,
    },
    {
      label: 'Failed',
      icon: AlertTriangle,
      path: '/failed',
      count: counts?.failed,
    },
  ];

  return (
    <aside className="w-[260px] h-screen border-r border-gray-200 flex flex-col pt-5 pr-4 pb-2 pl-2 bg-white">
      {/* Logo */}
      <div className="px-3 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: 'serif' }}>
          ONB
        </h1>
      </div>

      {/* User Profile */}
      <div className="px-3 mb-4">
        <button className="flex items-center gap-3 w-full text-left hover:bg-gray-50 rounded-lg p-1 transition-colors cursor-pointer group">
          <Avatar
            src={user?.avatar}
            name={user?.name || 'User'}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Oliver Brown'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user?.email || 'oliver.brown@domain.io'}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        </button>
      </div>

      {/* Compose Button */}
      <div className="px-3 mb-6">
        <Button
          variant="outline"
          className="w-full border-[#34A853] text-[#34A853] hover:bg-green-50 font-medium"
          onClick={() => navigate('/compose')}
        >
          Compose
        </Button>
      </div>

      {/* Navigation */}
      <div className="px-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          CORE
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-xs text-gray-400">{item.count}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Logout */}
      <div className="px-3 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-500 hover:text-red-600"
          onClick={logout}
        >
          Logout
        </Button>
      </div>
    </aside>
  );
}
