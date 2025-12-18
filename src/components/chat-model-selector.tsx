/**
 * Compact Model Selector for Chat Interface
 * A simplified dropdown that appears to the left of the chat input
 */

import { useState, useMemo } from 'react';
import { ChevronDown, Search, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useModel } from '@/contexts/model-context';

interface ChatModelSelectorProps {
  disabled?: boolean;
  className?: string;
}

export function ChatModelSelector({ disabled = false, className }: ChatModelSelectorProps) {
  const { selectedModel, setSelectedModel, availableModels, isLoadingModels } = useModel();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!search) return availableModels;
    return availableModels.filter(model =>
      model.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableModels, search]);

  // Get short display name (remove provider prefix for compactness)
  const getShortDisplayName = (modelId: string): string => {
    if (modelId === 'default') return 'Default';
    // Remove provider prefix if present (e.g., "openai/gpt-4o" -> "gpt-4o")
    const parts = modelId.split('/');
    return parts.length > 1 ? parts.slice(1).join('/') : modelId;
  };

  const currentDisplayName = getShortDisplayName(selectedModel);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || isLoadingModels}
          className={cn(
            "h-8 gap-1 px-2 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-3 transition-colors",
            "border border-transparent hover:border-border-primary/50 rounded-lg",
            className
          )}
        >
          <Sparkles className="size-3.5 text-accent" />
          <span className="max-w-[100px] truncate">{currentDisplayName}</span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" side="top" sideOffset={8}>
        {/* Search Input */}
        <div className="flex items-center border-b border-border-primary px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-text-tertiary" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 bg-transparent p-0 placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-0"
          />
        </div>

        {/* Model List */}
        <div className="max-h-[280px] overflow-y-auto p-1">
          {/* Default option */}
          <div
            onClick={() => {
              setSelectedModel('default');
              setOpen(false);
              setSearch('');
            }}
            className={cn(
              "flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/10",
              selectedModel === 'default' && "bg-accent/10"
            )}
          >
            <div className="flex items-center gap-2">
              <Check
                className={cn(
                  "h-4 w-4 text-accent",
                  selectedModel === 'default' ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="font-medium">Default (Auto)</span>
            </div>
            <Badge variant="secondary" className="text-xs">Platform</Badge>
          </div>

          {filteredModels.length === 0 && (
            <div className="py-6 text-center text-sm text-text-tertiary">
              No models found.
            </div>
          )}

          {filteredModels.map((model) => (
            <div
              key={model.value}
              onClick={() => {
                setSelectedModel(model.value);
                setOpen(false);
                setSearch('');
              }}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent/10",
                selectedModel === model.value && "bg-accent/10"
              )}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Check
                  className={cn(
                    "h-4 w-4 text-accent shrink-0",
                    selectedModel === model.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{getShortDisplayName(model.value)}</span>
              </div>
              <div className="shrink-0 ml-2">
                {model.hasUserKey ? (
                  <Badge variant="default" className="text-xs">BYOK</Badge>
                ) : model.byokAvailable ? (
                  <Badge variant="outline" className="text-xs">Key needed</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Platform</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border-primary px-3 py-2">
          <p className="text-xs text-text-tertiary">
            Model selection applies to all agents in this session
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
