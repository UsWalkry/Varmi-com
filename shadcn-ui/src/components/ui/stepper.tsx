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
 * Dikey adım göstergesi.
 * - Tamamlanan adımlar: yeşil tikli daire
 * - Aktif adım: mavi çerçeve + açıklama görünür
 * - Gelecek adım: gri çerçeve (açıklama gizli)
 */
export const Stepper: React.FC<StepperProps> = ({ steps, current, onStepClick, className }) => {
  return (
    <ol className={cn('flex flex-col gap-3', className)}>
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
                  state === 'done' && 'bg-green-600 text-white border-green-600',
                  state === 'active' && 'border-blue-600 text-blue-600 bg-blue-50',
                  state === 'upcoming' && 'border-gray-300 text-gray-400'
                )}
                aria-current={state === 'active' ? 'step' : undefined}
              >
                {state === 'done' ? '✓' : s.id}
              </div>
              <div className="flex flex-col">
                <span className={cn('text-sm font-medium', state === 'upcoming' && 'text-gray-500')}>{s.title}</span>
                {state === 'active' && s.description && (
                  <span className="text-xs text-muted-foreground">{s.description}</span>
                )}
              </div>
            </button>
            {/* Dikey bağlayıcı çizgi */}
            {idx < steps.length - 1 && (
              <div className="ml-4 mt-1 h-5 w-px bg-gradient-to-b from-gray-300 via-gray-200 to-transparent" />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default Stepper;
