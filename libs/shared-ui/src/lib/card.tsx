import React from 'react';

export interface CardProps {
  title: string;
  value: string;
  change?: string;
  icon?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  value,
  change,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/10 ${className}`}
    >
      {/* Glow highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-200 to-transparent" />
      
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
          {change && (
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <span className="text-emerald-600 font-semibold">{change.split(' ')[0]}</span>
              <span>{change.substring(change.indexOf(' ') + 1)}</span>
            </p>
          )}
        </div>
        {icon && (
          <span className="text-2xl p-2.5 rounded-xl bg-brand-50 border border-brand-100 text-brand-600">
            {icon}
          </span>
        )}
      </div>
    </div>
  );
};
