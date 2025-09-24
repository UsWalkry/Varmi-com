import React from 'react';
import { cn } from '@/lib/utils';

export interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  current: number; // 1-based index
  onStepClick?: (stepId: number) => void; // opsiyonel (ileri alınan adımlara geri dönmek için)
  className?: string;
}

/**
 * Basit yatay adım göstergesi.
 * - Tamamlanan adımlar: mavi dolu daire
 * - Aktif adım: mavi çerçeve
 * - Gelecek adım: gri çerçeve
 */
export const Stepper: React.FC<StepperProps> = ({ steps, current, onStepClick, className }) => {
  return (
    <ol className={cn('flex flex-col sm:flex-row gap-4 sm:gap-6', className)}>
      {steps.map((s, idx) => {
        const state: 'done' | 'active' | 'upcoming' = (idx + 1) < current
          ? 'done'
          : (idx + 1) === current
            ? 'active'
            : 'upcoming';
        return (
          <li key={s.id} className="flex-1 min-w-0">
            <button
              type="button"
              disabled={state === 'upcoming' || !onStepClick}
              onClick={() => onStepClick && onStepClick(s.id)}
              className={cn(
                'group flex w-full items-start gap-3 text-left',
                state === 'upcoming' && 'cursor-default'
              )}
            >
              <div
                className={cn(
                  'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium transition',
                  state === 'done' && 'bg-blue-600 text-white border-blue-600',
                  state === 'active' && 'border-blue-600 text-blue-600 bg-blue-50',
                  state === 'upcoming' && 'border-gray-300 text-gray-400'
                )}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {state === 'done' ? '✓' : s.id}
              </div>
              <div className="flex flex-col">
                <span className={cn('text-sm font-medium', state === 'upcoming' && 'text-gray-500')}>{s.title}</span>
                {s.description && (
                  <span className="text-xs text-muted-foreground line-clamp-2">{s.description}</span>
                )}
              </div>
            </button>
            {/* Connector çizgisi (sm ve üzeri) */}
            {idx < steps.length - 1 && (
              <div className="hidden sm:block ml-4 mt-1 h-px w-[calc(100%-1rem)] bg-gradient-to-r from-gray-300 via-gray-200 to-transparent" />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
