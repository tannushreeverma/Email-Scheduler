import { useState, useRef } from 'react';
import { Clock, Calendar } from 'lucide-react';
import { format, addDays, setHours, setMinutes } from 'date-fns';

interface SendLaterDropdownProps {
  onSelect: (dateTime: string) => void;
  onClose: () => void;
}

export default function SendLaterDropdown({ onSelect, onClose }: SendLaterDropdownProps) {
  const [showCustom, setShowCustom] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const tomorrow = addDays(new Date(), 1);

  const presets = [
    {
      label: 'Tomorrow',
      value: setHours(setMinutes(tomorrow, 0), 9).toISOString(),
    },
    {
      label: 'Tomorrow, 10:00 AM',
      value: setHours(setMinutes(tomorrow, 0), 10).toISOString(),
    },
    {
      label: 'Tomorrow, 11:00 AM',
      value: setHours(setMinutes(tomorrow, 0), 11).toISOString(),
    },
    {
      label: 'Tomorrow, 3:00 PM',
      value: setHours(setMinutes(tomorrow, 0), 15).toISOString(),
    },
  ];

  return (
    <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Send Later</h3>

        {/* Custom date/time picker */}
        <div className="mb-3">
          <button
            onClick={() => {
              setShowCustom(!showCustom);
              setTimeout(() => dateInputRef.current?.showPicker(), 100);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            <Calendar className="h-4 w-4" />
            <span>Pick date & time</span>
          </button>
          {showCustom && (
            <input
              ref={dateInputRef}
              type="datetime-local"
              className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#34A853]"
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => {
                if (e.target.value) {
                  onSelect(new Date(e.target.value).toISOString());
                }
              }}
            />
          )}
        </div>

        <div className="border-t border-gray-100 pt-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => onSelect(preset.value)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
            >
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-3 mt-2 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
