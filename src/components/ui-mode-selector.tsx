/**
 * UI Mode Selector for Chat Interface
 * Allows users to select the UI generation style for the AI agent
 */

import { useState } from 'react';
import { ChevronDown, Check, Box, Palette, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useUIMode, UI_MODE_OPTIONS } from '@/contexts/ui-mode-context';

interface UIModeSelectorProps {
  disabled?: boolean;
  className?: string;
}

const ICONS: Record<string, typeof Box> = {
  box: Box,
  palette: Palette,
  zap: Zap,
};

export function UIModeSelector({ disabled = false, className }: UIModeSelectorProps) {
  const { mode, setMode, getModeOption } = useUIMode();
  const [open, setOpen] = useState(false);

  const currentOption = getModeOption();
  const CurrentIcon = ICONS[currentOption.icon] || Box;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            'h-8 gap-1 px-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-3 transition-colors',
            'border border-transparent hover:border-border-primary/50 rounded-lg',
            className
          )}
        >
          <CurrentIcon className="size-3.5 text-accent" />
          <span className="max-w-[80px] truncate">{currentOption.label}</span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" side="top" sideOffset={8}>
        {/* Title */}
        <div className="border-b border-border-primary px-3 py-2">
          <p className="text-sm font-medium text-text-primary">UI Generation Mode</p>
          <p className="text-xs text-text-tertiary">Select component style for AI</p>
        </div>

        {/* Options List */}
        <div className="p-1" role="listbox" aria-label="UI Mode Options">
          {UI_MODE_OPTIONS.map((option) => {
            const Icon = ICONS[option.icon] || Box;
            const isSelected = mode === option.value;

            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => {
                  setMode(option.value);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setMode(option.value);
                    setOpen(false);
                  }
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent',
                  isSelected && 'bg-accent/10'
                )}
              >
                <div className={cn(
                  'flex size-8 items-center justify-center rounded-md',
                  isSelected ? 'bg-accent/20 text-accent' : 'bg-bg-3 text-text-secondary'
                )}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 text-accent',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </div>
                  <p className="text-xs text-text-tertiary truncate">{option.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border-primary px-3 py-2">
          <p className="text-xs text-text-tertiary">
            {mode === 'shadcn'
              ? 'AI will prioritize shadcn/ui components'
              : mode === 'custom'
              ? 'AI has creative freedom for UI'
              : 'AI will generate simple, lightweight UI'
            }
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
