import type { ToolDefinition } from './types';
import { StructuredLogger } from '../../logger';
import { RenderToolCall } from '../operations/UserConversationProcessor';
import { toolWebSearchDefinition } from './toolkit/web-search';
import { toolFeedbackDefinition } from './toolkit/feedback';
import { createQueueRequestTool } from './toolkit/queue-request';
import { createGetLogsTool } from './toolkit/get-logs';
import { createDeployPreviewTool } from './toolkit/deploy-preview';
import { CodingAgentInterface } from 'worker/agents/services/implementations/CodingAgent';
import { createDeepDebuggerTool } from "./toolkit/deep-debugger";
import { createRenameProjectTool } from './toolkit/rename-project';
import { createAlterBlueprintTool } from './toolkit/alter-blueprint';
import { DebugSession } from '../assistants/codeDebugger';
import { createReadFilesTool } from './toolkit/read-files';
import { createExecCommandsTool } from './toolkit/exec-commands';
import { createRunAnalysisTool } from './toolkit/run-analysis';
import { createRegenerateFileTool } from './toolkit/regenerate-file';
import { createGenerateFilesTool } from './toolkit/generate-files';
import { createWaitTool } from './toolkit/wait';
import { createGetRuntimeErrorsTool } from './toolkit/get-runtime-errors';
import { createWaitForGenerationTool } from './toolkit/wait-for-generation';
import { createWaitForDebugTool } from './toolkit/wait-for-debug';
import { createGitTool } from './toolkit/git';
import { createShadcnComponentTool } from './toolkit/shadcn-components';
import { MCPManager } from './mcpManager';

export async function executeToolWithDefinition<TArgs, TResult>(
    toolDef: ToolDefinition<TArgs, TResult>,
    args: TArgs
): Promise<TResult> {
    toolDef.onStart?.(args);
    const result = await toolDef.implementation(args);
    toolDef.onComplete?.(args, result);
    return result;
}

/**
 * Build all available tools for the agent
 * Add new tools here - they're automatically included in the conversation
 */
export function buildTools(
    agent: CodingAgentInterface,
    logger: StructuredLogger,
    toolRenderer: RenderToolCall,
    streamCb: (chunk: string) => void,
): ToolDefinition<any, any>[] {
    return [
        toolWebSearchDefinition,
        toolFeedbackDefinition,
        createQueueRequestTool(agent, logger),
        createGetLogsTool(agent, logger),
        createDeployPreviewTool(agent, logger),
        createWaitForGenerationTool(agent, logger),
        createWaitForDebugTool(agent, logger),
        createRenameProjectTool(agent, logger),
        createAlterBlueprintTool(agent, logger),
        // Git tool (safe version - no reset for user conversations)
        createGitTool(agent, logger, { excludeCommands: ['reset'] }),
        // Deep autonomous debugging assistant tool
        createDeepDebuggerTool(agent, logger, toolRenderer, streamCb),
        // shadcn/ui component retrieval tool
        createShadcnComponentTool(logger),
    ];
}

/**
 * Build tools including MCP server tools
 * @param agent - The coding agent instance
 * @param logger - Structured logger
 * @param toolRenderer - Tool call renderer for UI updates
 * @param streamCb - Streaming callback
 * @param mcpManager - Optional MCP manager with connected servers
 */
export async function buildToolsWithMCP(
    agent: CodingAgentInterface,
    logger: StructuredLogger,
    toolRenderer: RenderToolCall,
    streamCb: (chunk: string) => void,
    mcpManager?: MCPManager,
): Promise<ToolDefinition<any, any>[]> {
    // Start with native tools
    const tools = buildTools(agent, logger, toolRenderer, streamCb);

    // Add MCP tools if manager is provided and has connections
    if (mcpManager && mcpManager.isConnected()) {
        try {
            const mcpTools = await mcpManager.getToolDefinitionsForAgent();
            logger.info('MCP tools loaded', {
                count: mcpTools.length,
                status: mcpManager.getStatus(),
            });

            // Add tool renderer callbacks to MCP tools
            const wrappedMcpTools = mcpTools.map(td => ({
                ...td,
                onStart: (args: Record<string, unknown>) => {
                    toolRenderer({ name: td.function.name, status: 'start', args });
                    td.onStart?.(args);
                },
                onComplete: (args: Record<string, unknown>, result: unknown) => {
                    // Safely serialize result for display
                    let serializedResult: string;
                    if (typeof result === 'string') {
                        serializedResult = result;
                    } else {
                        try {
                            serializedResult = JSON.stringify(result);
                        } catch {
                            serializedResult = '[Failed to serialize result]';
                        }
                    }
                    toolRenderer({
                        name: td.function.name,
                        status: 'success',
                        args,
                        result: serializedResult
                    });
                    td.onComplete?.(args, serializedResult);
                },
            }));

            tools.push(...wrappedMcpTools);
        } catch (error) {
            logger.error('Failed to load MCP tools', { error: String(error) });
        }
    }

    return tools;
}

export function buildDebugTools(session: DebugSession, logger: StructuredLogger, toolRenderer?: RenderToolCall): ToolDefinition<any, any>[] {
  const tools = [
    createGetLogsTool(session.agent, logger),
    createGetRuntimeErrorsTool(session.agent, logger),
    createReadFilesTool(session.agent, logger),
    createRunAnalysisTool(session.agent, logger),
    createExecCommandsTool(session.agent, logger),
    createRegenerateFileTool(session.agent, logger),
    createGenerateFilesTool(session.agent, logger),
    createDeployPreviewTool(session.agent, logger),
    createWaitTool(logger),
    createGitTool(session.agent, logger),
    // shadcn/ui component retrieval for debug sessions
    createShadcnComponentTool(logger),
  ];

  // Attach tool renderer for UI visualization if provided
  if (toolRenderer) {
    return tools.map(td => ({
      ...td,
      onStart: (args: Record<string, unknown>) => toolRenderer({ name: td.function.name, status: 'start', args }),
      onComplete: (args: Record<string, unknown>, result: unknown) => toolRenderer({ 
        name: td.function.name, 
        status: 'success', 
        args,
        result: typeof result === 'string' ? result : JSON.stringify(result)
      })
    }));
  }

  return tools;
}
