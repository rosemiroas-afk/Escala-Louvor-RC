import React from 'react';
import { MinisterialRole } from '../types/index.ts';

interface RoleBadgeProps {
  role: MinisterialRole | string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ROLE_CONFIG: Record<
  MinisterialRole,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  Ministro: {
    label: 'Ministro',
    icon: '🎤',
    bg: 'bg-purple-100 dark:bg-purple-950/60',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-800'
  },
  Guitarrista: {
    label: 'Guitarrista',
    icon: '🎸',
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800'
  },
  Tecladista: {
    label: 'Tecladista',
    icon: '🎹',
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-800'
  },
  Violonista: {
    label: 'Violonista',
    icon: '🪕',
    bg: 'bg-orange-100 dark:bg-orange-950/60',
    text: 'text-orange-800 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-800'
  },
  Baterista: {
    label: 'Baterista',
    icon: '🥁',
    bg: 'bg-rose-100 dark:bg-rose-950/60',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800'
  },
  Baixista: {
    label: 'Baixista',
    icon: '🎻',
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800'
  },
  Contralto: {
    label: 'Contralto',
    icon: '🎶',
    bg: 'bg-teal-100 dark:bg-teal-950/60',
    text: 'text-teal-800 dark:text-teal-300',
    border: 'border-teal-300 dark:border-teal-800'
  },
  Soprano: {
    label: 'Soprano',
    icon: '🎵',
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-950/60',
    text: 'text-fuchsia-800 dark:text-fuchsia-300',
    border: 'border-fuchsia-300 dark:border-fuchsia-800'
  },
  Tenor: {
    label: 'Tenor',
    icon: '🎼',
    bg: 'bg-sky-100 dark:bg-sky-950/60',
    text: 'text-sky-800 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-800'
  }
};

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md', className = '' }) => {
  if (!role || !(role in ROLE_CONFIG)) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 ${
          size === 'sm'
            ? 'px-2 py-0.5 text-xs'
            : size === 'lg'
            ? 'px-3 py-1.5 text-sm'
            : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        <span>❓</span>
        <span>Sem função</span>
      </span>
    );
  }

  const conf = ROLE_CONFIG[role as MinisterialRole];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border shadow-xs ${conf.bg} ${conf.text} ${conf.border} ${
        size === 'sm'
          ? 'px-2 py-0.5 text-xs'
          : size === 'lg'
          ? 'px-3.5 py-1.5 text-sm'
          : 'px-2.5 py-0.5 text-xs'
      } ${className}`}
    >
      <span className="text-sm">{conf.icon}</span>
      <span>{conf.label}</span>
    </span>
  );
};
