import React from 'react';
import {useOpd} from '../context/OpdContext';

export const PublicFooter: React.FC = () => {
  const {setView, currentStaff} = useOpd();

  return (
    <footer className="border-t border-[#DCE7F5] dark:border-[#1B3154] bg-white dark:bg-[#0B172B] mt-16 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="space-y-1">
          <p className="font-display font-semibold text-[#0B1E3D] dark:text-white">
            District Civil Hospital · SmartOPD Queue System
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Outpatient Department hours: 08:30 AM – 02:30 PM · Emergency Helpline: 108
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setView('register')}
            className="hover:text-[#0F5CA8] dark:hover:text-sky-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            Book OPD Token
          </button>
          <button
            type="button"
            onClick={() => setView('track')}
            className="hover:text-[#0F5CA8] dark:hover:text-sky-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            Track Token
          </button>
          <button
            type="button"
            onClick={() => setView('public-board')}
            className="hover:text-[#0F5CA8] dark:hover:text-sky-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            Waiting Hall Board
          </button>
          <button
            type="button"
            onClick={() => setView(currentStaff ? 'staff-dashboard' : 'staff-login')}
            className="hover:text-[#0F5CA8] dark:hover:text-sky-400 transition-colors cursor-pointer whitespace-nowrap"
          >
            Hospital Staff Login
          </button>
        </div>
      </div>
    </footer>
  );
};
