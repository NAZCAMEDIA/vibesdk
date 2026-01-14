import { ChatCompletionFunctionTool } from 'openai/resources';

/**
 * Legacy MCP server config (for backward compatibility)
 */
export interface MCPServerConfig {
	name: string;
	sseUrl: string;
}

/**
 * Dynamic MCP server config (from database)
 * Uses discriminated union to enforce authToken requirement based on authType
 */
type BaseMCPServerConfig = {
	id: string;
	name: string;
	url: string;
	transport: 'http' | 'sse' | 'stdio';
	enabled: boolean;
};

export type DynamicMCPServerConfig = BaseMCPServerConfig & (
	| { authType: 'none'; authToken?: never }
	| { authType: 'bearer'; authToken: string }
	| { authType: 'api-key'; authToken: string }
);
export interface MCPResult {
	content: string;
}

export interface ErrorResult {
	error: string;
}

export interface ToolCallResult {
	id: string;
	name: string;
	arguments: Record<string, unknown>;
	result?: unknown;
}

export type ToolImplementation<TArgs = Record<string, unknown>, TResult = unknown> = 
	(args: TArgs) => Promise<TResult>;

export type ToolDefinition<
    TArgs = Record<string, unknown>,
    TResult = unknown
> = ChatCompletionFunctionTool & {
    implementation: ToolImplementation<TArgs, TResult>;
    onStart?: (args: TArgs) => void;
    onComplete?: (args: TArgs, result: TResult) => void;
};

export type ExtractToolArgs<T> = T extends ToolImplementation<infer A, any> ? A : never;

export type ExtractToolResult<T> = T extends ToolImplementation<any, infer R> ? R : never;