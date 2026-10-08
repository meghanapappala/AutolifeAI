import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 card-shadow ${hover ? 'transition-all duration-200 hover:card-shadow-lg hover:-translate-y-0.5 cursor-pointer' : ''} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-3">
        {icon && <div className="text-primary-600 dark:text-primary-400">{icon}</div>}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
