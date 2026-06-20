import React from 'react';

export interface HeaderProps {
  appName: string;
  themeColor?: string;
}

export const Header: React.FC<HeaderProps> = ({
  appName,
  themeColor = 'border-slate-200 bg-white/80',
}) => {
  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${themeColor} px-6 py-4 transition-all shadow-sm`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-500 to-brand-700 flex items-center justify-center font-black text-white text-base shadow-lg shadow-brand-500/30">
            Q
          </div>
          <div>
            <span className="font-extrabold text-slate-900 tracking-tight">QuestionGen</span>
            <span className="ml-1.5 text-[10px] font-bold tracking-widest text-brand-700 uppercase px-1.5 py-0.5 rounded border border-brand-200 bg-brand-50">
              {appName}
            </span>
          </div>
        </div>

        {/* Action Links */}
        <div className="flex items-center gap-6 text-sm">
          <nav className="hidden md:flex items-center gap-6 font-medium text-slate-600">
            <a href="#" className="hover:text-brand-600 transition">Dashboard</a>
            <a href="#" className="hover:text-brand-600 transition">Libraries</a>
            <a href="#" className="hover:text-brand-600 transition">Quizzes</a>
            <a href="#" className="hover:text-brand-600 transition">Support</a>
          </nav>
          
          <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
            <div className="h-8 w-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-xs font-bold text-brand-700">
              JD
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-slate-700">John Doe</span>
          </div>
        </div>
      </div>
    </header>
  );
};
