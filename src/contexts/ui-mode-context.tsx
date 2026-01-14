/**
 * UI Mode Context
 * Controls the UI generation style for the AI agent
 * Options: shadcn (use shadcn/ui components), custom (freeform), minimal (simple)
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type UIMode = 'shadcn' | 'custom' | 'minimal';

export interface UIModeOption {
  value: UIMode;
  label: string;
  description: string;
  icon: string;
}

export const UI_MODE_OPTIONS: UIModeOption[] = [
  {
    value: 'shadcn',
    label: 'shadcn/ui',
    description: '170+ professional components',
    icon: 'box',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Freeform styling',
    icon: 'palette',
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Simple, lightweight UI',
    icon: 'zap',
  },
];

interface UIModeContextType {
  mode: UIMode;
  setMode: (mode: UIMode) => void;
  getModeOption: () => UIModeOption;
  getSystemPromptAddition: () => string;
}

const UIModeContext = createContext<UIModeContextType | undefined>(undefined);

const STORAGE_KEY = 'vibesdk_ui_mode';

// System prompt additions for each mode
const SYSTEM_PROMPTS: Record<UIMode, string> = {
  shadcn: `
## UI Generation Mode: shadcn/ui

When generating UI components, PRIORITIZE using shadcn/ui components from the installed library.

### Available Components (170+)
- Layout: Card, Dialog, Sheet, Drawer, Tabs, Accordion, Collapsible, Sidebar
- Forms: Input, Textarea, Select, Checkbox, RadioGroup, Switch, Slider, Form
- Data: Table, DataTable, Avatar, Badge, Progress, Skeleton, Calendar
- Feedback: Alert, AlertDialog, Toast, Dialog, Spinner
- Navigation: NavigationMenu, Menubar, Breadcrumb, Pagination
- Charts: AreaChart, BarChart, LineChart, PieChart, RadarChart (Recharts-based)
- Advanced: Command, CommandPalette, Dock, Kanban, CodeEditor

### Design Principles
1. **Composition First**: Build complex UIs by composing simple components
2. **Consistent Spacing**: Use Tailwind spacing scale (p-4, gap-4, etc.)
3. **Theme Variables**: Use CSS variables (--primary, --muted, --accent)
4. **Accessibility**: All components include ARIA attributes
5. **Dark Mode**: Components auto-adapt to dark/light themes

### Import Pattern
\`\`\`tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
\`\`\`

### DO NOT
- Write custom CSS when shadcn utilities exist
- Create custom form handling (use shadcn Form + react-hook-form)
- Build custom modals (use Dialog or Sheet)
- Create custom dropdowns (use Select or DropdownMenu)
`,
  custom: `
## UI Generation Mode: Custom

Generate UI with full creative freedom. Use Tailwind CSS utilities and custom styling.
Focus on unique, tailored designs that match the user's specific requirements.
`,
  minimal: `
## UI Generation Mode: Minimal

Generate simple, lightweight UI with minimal dependencies.
Focus on:
- Native HTML elements
- Essential Tailwind utilities only
- Fast load times
- Accessibility
Avoid complex component libraries or heavy animations.
`,
};

export function UIModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UIMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['shadcn', 'custom', 'minimal'].includes(stored)) {
        return stored as UIMode;
      }
      return 'shadcn'; // Default to shadcn
    } catch {
      return 'shadcn';
    }
  });

  const setMode = useCallback((newMode: UIMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch (error) {
      console.warn('Failed to persist UI mode:', error);
    }
  }, []);

  const getModeOption = useCallback((): UIModeOption => {
    return UI_MODE_OPTIONS.find((opt) => opt.value === mode) || UI_MODE_OPTIONS[0];
  }, [mode]);

  const getSystemPromptAddition = useCallback((): string => {
    return SYSTEM_PROMPTS[mode];
  }, [mode]);

  const value: UIModeContextType = useMemo(
    () => ({
      mode,
      setMode,
      getModeOption,
      getSystemPromptAddition,
    }),
    [mode, setMode, getModeOption, getSystemPromptAddition]
  );

  return <UIModeContext.Provider value={value}>{children}</UIModeContext.Provider>;
}

export function useUIMode() {
  const context = useContext(UIModeContext);
  if (context === undefined) {
    throw new Error('useUIMode must be used within a UIModeProvider');
  }
  return context;
}
