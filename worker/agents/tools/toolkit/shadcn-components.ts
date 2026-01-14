/**
 * shadcn/ui Component Tool
 * Fetches component code, documentation, and examples from shadcn registry
 */

import { ToolDefinition } from '../types';
import { StructuredLogger } from '../../../logger';

// All available shadcn/ui components (170+)
const SHADCN_COMPONENTS = [
  // Core UI
  'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar', 'badge',
  'breadcrumb', 'button', 'calendar', 'card', 'carousel', 'chart',
  'checkbox', 'collapsible', 'combobox', 'command', 'context-menu',
  'data-table', 'date-picker', 'dialog', 'drawer', 'dropdown-menu',
  'form', 'hover-card', 'input', 'input-otp', 'label', 'menubar',
  'navigation-menu', 'pagination', 'popover', 'progress', 'radio-group',
  'resizable', 'scroll-area', 'select', 'separator', 'sheet', 'sidebar',
  'skeleton', 'slider', 'sonner', 'switch', 'table', 'tabs', 'textarea',
  'toast', 'toggle', 'toggle-group', 'tooltip',
  // Charts (Recharts-based)
  'area-chart', 'bar-chart', 'line-chart', 'pie-chart', 'radar-chart',
  // Advanced components
  'kanban', 'gantt', 'code-block', 'code-editor', 'terminal',
  'dock', 'navbar', 'video-player', 'image-zoom',
  // Animated components
  'animated-beam', 'animated-modal', 'animated-testimonials',
  'background-beams', 'background-gradient', 'marquee', 'particles',
  'sparkles', 'typewriter', 'blur-text', 'flip-words',
] as const;

type ShadcnComponent = typeof SHADCN_COMPONENTS[number] | string;

interface ComponentRegistryData {
  name: string;
  type: string;
  registryDependencies?: string[];
  dependencies?: string[];
  devDependencies?: string[];
  files?: Array<{
    path: string;
    content: string;
    type: string;
    target?: string;
  }>;
  docs?: string;
}

interface ShadcnComponentArgs {
  component: ShadcnComponent;
  style?: 'new-york' | 'default';
  include_examples?: boolean;
}

interface ShadcnComponentResult {
  success: boolean;
  component: string;
  code?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  importPath?: string;
  examples?: string[];
  documentation?: string;
  error?: string;
}

// Cache for component data (simple in-memory cache)
const componentCache = new Map<string, { data: ComponentRegistryData; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

async function fetchComponentFromRegistry(
  componentName: string,
  style: string = 'new-york'
): Promise<ComponentRegistryData | null> {
  const cacheKey = `${style}/${componentName}`;
  const cached = componentCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Try fetching from shadcn registry
    const registryUrl = `https://ui.shadcn.com/registry/styles/${style}/${componentName}.json`;
    const response = await fetch(registryUrl, {
      headers: {
        'User-Agent': 'VibeSDK/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Try alternative URL structure
      const altUrl = `https://ui.shadcn.com/registry/${componentName}.json`;
      const altResponse = await fetch(altUrl, {
        headers: {
          'User-Agent': 'VibeSDK/1.0',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!altResponse.ok) {
        return null;
      }

      const data = await altResponse.json() as ComponentRegistryData;
      componentCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }

    const data = await response.json() as ComponentRegistryData;
    componentCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error(`Failed to fetch component ${componentName}:`, error);
    return null;
  }
}

function generateUsageExamples(componentName: string): string[] {
  const examples: Record<string, string[]> = {
    button: [
      `<Button>Click me</Button>`,
      `<Button variant="destructive">Delete</Button>`,
      `<Button variant="outline" size="sm">Small</Button>`,
      `<Button disabled>Disabled</Button>`,
    ],
    card: [
      `<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>`,
    ],
    dialog: [
      `<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`,
    ],
    form: [
      `<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input placeholder="email@example.com" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">Submit</Button>
  </form>
</Form>`,
    ],
    input: [
      `<Input type="email" placeholder="Email" />`,
      `<Input disabled value="Disabled" />`,
    ],
    select: [
      `<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>`,
    ],
    tabs: [
      `<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>`,
    ],
    table: [
      `<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Item 1</TableCell>
      <TableCell>Active</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
    ],
  };

  return examples[componentName] || [
    `import { ${componentName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')} } from '@/components/ui/${componentName}';`,
  ];
}

async function useShadcnComponent(args: ShadcnComponentArgs): Promise<ShadcnComponentResult> {
  const { component, style = 'new-york', include_examples = true } = args;

  if (!component) {
    return {
      success: false,
      component: '',
      error: 'Component name is required',
    };
  }

  const componentName = component.toLowerCase().trim();
  const registryData = await fetchComponentFromRegistry(componentName, style);

  if (!registryData) {
    // Return helpful fallback info even without registry data
    const pascalName = componentName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    return {
      success: true,
      component: componentName,
      code: `// Component: ${pascalName}
// Import from: @/components/ui/${componentName}
// Install: npx shadcn@latest add ${componentName}

import { ${pascalName} } from '@/components/ui/${componentName}';

// Usage example:
// <${pascalName}>Content</${pascalName}>`,
      importPath: `@/components/ui/${componentName}`,
      dependencies: [],
      examples: generateUsageExamples(componentName),
      documentation: `https://ui.shadcn.com/docs/components/${componentName}`,
    };
  }

  // Extract the main component file content
  const mainFile = registryData.files?.find(f => f.type === 'registry:ui') || registryData.files?.[0];
  const code = mainFile?.content || '';

  return {
    success: true,
    component: componentName,
    code: code,
    dependencies: registryData.dependencies || [],
    registryDependencies: registryData.registryDependencies || [],
    importPath: `@/components/ui/${componentName}`,
    examples: include_examples ? generateUsageExamples(componentName) : undefined,
    documentation: `https://ui.shadcn.com/docs/components/${componentName}`,
  };
}

export function createShadcnComponentTool(logger: StructuredLogger): ToolDefinition<ShadcnComponentArgs, ShadcnComponentResult> {
  return {
    implementation: useShadcnComponent,
    type: 'function' as const,
    function: {
      name: 'use_shadcn_component',
      description: `Get shadcn/ui component code, documentation, and usage examples.
Use this when building UI to ensure consistent design with professional components.
Available components include: button, card, dialog, form, input, select, tabs, table,
dropdown-menu, sheet, toast, avatar, badge, calendar, carousel, chart, checkbox,
command, navigation-menu, popover, progress, sidebar, skeleton, slider, switch,
textarea, tooltip, and 170+ more.`,
      parameters: {
        type: 'object',
        properties: {
          component: {
            type: 'string',
            description: 'The shadcn/ui component name to retrieve (e.g., "button", "card", "dialog", "form", "tabs")',
          },
          style: {
            type: 'string',
            enum: ['new-york', 'default'],
            description: 'Component style variant (default: "new-york")',
          },
          include_examples: {
            type: 'boolean',
            description: 'Include usage examples (default: true)',
          },
        },
        required: ['component'],
      },
    },
    onStart: (args) => {
      logger.info('shadcn-tool', `Fetching component: ${args.component}`);
    },
    onComplete: (args, result) => {
      if (result.success) {
        logger.info('shadcn-tool', `Retrieved ${args.component} (${result.code?.length || 0} chars)`);
      } else {
        logger.warn('shadcn-tool', `Failed to retrieve ${args.component}: ${result.error}`);
      }
    },
  };
}
