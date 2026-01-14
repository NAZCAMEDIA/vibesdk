import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createLogger } from '../../logger';
import { MCPServerConfig, DynamicMCPServerConfig, ToolDefinition } from './types';

const logger = createLogger('MCPManager');

// Default static servers (can be empty)
const MCP_SERVERS: MCPServerConfig[] = [];

/**
 * MCP Manager - Based on the reference implementation from vite-cfagents-runner
 * Manages connections to multiple MCP servers and provides unified tool access
 *
 * Now supports both static configuration and dynamic user-configured servers
 */
export class MCPManager {
	private clients: Map<string, Client> = new Map();
	private toolMap: Map<string, string> = new Map();
	private toolDefinitions: Map<string, unknown> = new Map();
	private initialized = false;
	private dynamicServers: DynamicMCPServerConfig[] = [];

	/**
	 * Initialize with static servers only
	 */
	async initialize() {
		if (this.initialized) return;
		await this.initializeWithServers(MCP_SERVERS.map(s => ({
			id: s.name,
			name: s.name,
			url: s.sseUrl,
			transport: 'sse' as const,
			authType: 'none' as const,
			enabled: true,
		})));
	}

	/**
	 * Initialize with dynamic server configurations
	 */
	async initializeWithServers(servers: DynamicMCPServerConfig[]) {
		if (this.initialized) {
			// Reset for re-initialization with new servers
			await this.shutdown();
		}

		this.dynamicServers = servers.filter(s => s.enabled);
		logger.info(`Initializing MCP manager with ${this.dynamicServers.length} servers...`);

		for (const serverConfig of this.dynamicServers) {
			try {
				await this.connectServer(serverConfig);
			} catch (error) {
				logger.error(
					`Failed to connect to MCP server ${serverConfig.name}:`,
					error,
				);
			}
		}

		this.initialized = true;
		logger.info(
			`MCP manager initialized with ${this.clients.size} active connections`,
		);
	}

	/**
	 * Connect to a single MCP server
	 */
	private async connectServer(serverConfig: DynamicMCPServerConfig) {
		logger.info(`Connecting to MCP server ${serverConfig.name} (${serverConfig.transport})`);

		let transport;
		const headers: Record<string, string> = {};

		// Add auth headers if needed
		if (serverConfig.authType === 'bearer' && serverConfig.authToken) {
			headers['Authorization'] = `Bearer ${serverConfig.authToken}`;
		} else if (serverConfig.authType === 'api-key' && serverConfig.authToken) {
			headers['X-API-Key'] = serverConfig.authToken;
		}

		// Select transport based on type
		if (serverConfig.transport === 'http') {
			transport = new StreamableHTTPClientTransport(
				new URL(serverConfig.url),
				{ requestInit: { headers } }
			);
		} else {
			// Default to SSE
			transport = new SSEClientTransport(
				new URL(serverConfig.url),
				{ requestInit: { headers } }
			);
		}

		const client = new Client(
			{
				name: 'vibe-platform-agent',
				version: '1.0.0',
			},
			{
				capabilities: {},
			},
		);

		await client.connect(transport, { timeout: 5000, maxTotalTimeout: 10000 });
		logger.info(`Connected to MCP server ${serverConfig.name}`);
		this.clients.set(serverConfig.id, client);

		// Fetch and register tools
		const toolsResult = await client.listTools();

		if (toolsResult?.tools) {
			for (const tool of toolsResult.tools) {
				const toolId = `${serverConfig.id}:${tool.name}`;
				// Warn on tool name collision to prevent silent overwrites
				if (this.toolMap.has(tool.name)) {
					logger.warn(`Tool name collision: ${tool.name} already registered from server ${this.toolMap.get(tool.name)}, overwriting with ${serverConfig.id}`);
				}
				this.toolMap.set(tool.name, serverConfig.id);
				this.toolDefinitions.set(toolId, tool);
			}
		}

		logger.info(
			`Connected to MCP server ${serverConfig.name}, found ${toolsResult?.tools?.length || 0} tools`,
		);
	}

	async getToolDefinitions() {
		await this.initialize();
		const allTools = [];

		for (const [serverName, client] of this.clients.entries()) {
			try {
				const toolsResult = await client.listTools();

				if (toolsResult?.tools) {
					for (const tool of toolsResult.tools) {
						allTools.push({
							type: 'function' as const,
							function: {
								name: tool.name,
								description: tool.description || '',
								parameters: tool.inputSchema || {
									type: 'object',
									properties: {},
									required: [],
								},
							},
						});
					}
				}
			} catch (error) {
				logger.error(`Error getting tools from ${serverName}:`, error);
			}
		}

		return allTools;
	}

	async executeTool(
		toolName: string,
		args: Record<string, unknown>,
	): Promise<string> {
		await this.initialize();

		const serverName = this.toolMap.get(toolName);
		if (!serverName) {
			throw new Error(`Tool ${toolName} not found in any MCP server`);
		}

		const client = this.clients.get(serverName);
		if (!client) {
			throw new Error(`Client for server ${serverName} not available`);
		}

		try {
			const result = await client.callTool({
				name: toolName,
				arguments: args,
			});

			if (result.isError) {
				throw new Error(
					`Tool execution failed: ${Array.isArray(result.content) ? result.content.map((c: { text: string }) => c.text).join('\n') : 'Unknown error'}`,
				);
			}

			if (Array.isArray(result.content)) {
				return result.content
					.filter((c: { type: string }) => c.type === 'text')
					.map((c: { text: string }) => c.text)
					.join('\n');
			}

			return 'No content returned';
		} catch (error) {
			throw new Error(`Tool execution failed: ${String(error)}`);
		}
	}

	hasToolAvailable(toolName: string): boolean {
		return this.toolMap.has(toolName);
	}

	getAvailableToolNames(): string[] {
		return Array.from(this.toolMap.keys());
	}

	/**
	 * Get tools as ToolDefinition[] for integration with agent toolkit
	 * Each MCP tool is wrapped with an implementation that calls executeTool
	 */
	async getToolDefinitionsForAgent(): Promise<ToolDefinition<Record<string, unknown>, string>[]> {
		await this.initialize();
		const tools: ToolDefinition<Record<string, unknown>, string>[] = [];

		for (const [serverId, client] of this.clients.entries()) {
			try {
				const toolsResult = await client.listTools();

				if (toolsResult?.tools) {
					for (const tool of toolsResult.tools) {
						const toolName = tool.name;
						// Create a tool definition with implementation
						tools.push({
							type: 'function' as const,
							function: {
								name: toolName,
								description: tool.description || `MCP tool: ${toolName}`,
								parameters: tool.inputSchema || {
									type: 'object',
									properties: {},
									required: [],
								},
							},
							implementation: async (args: Record<string, unknown>) => {
								return await this.executeTool(toolName, args);
							},
							onStart: (args) => {
								logger.info(`MCP tool starting: ${toolName}`, { args });
							},
							onComplete: (_args, result) => {
								logger.info(`MCP tool completed: ${toolName}`, {
									resultLength: result?.length || 0
								});
							},
						});
					}
				}
			} catch (error) {
				logger.error(`Error getting tools from server ${serverId}:`, error);
			}
		}

		logger.info(`Prepared ${tools.length} MCP tools for agent`);
		return tools;
	}

	/**
	 * Check if manager has any connected servers
	 */
	isConnected(): boolean {
		return this.clients.size > 0;
	}

	/**
	 * Get connection status summary
	 */
	getStatus(): { connected: number; total: number; serverIds: string[] } {
		return {
			connected: this.clients.size,
			total: this.dynamicServers.length,
			serverIds: Array.from(this.clients.keys()),
		};
	}

	async shutdown(): Promise<void> {
		logger.info('Shutting down MCP manager...');

		// MCP SDK handles cleanup automatically
		this.clients.clear();
		this.toolMap.clear();
		this.toolDefinitions.clear();
		this.initialized = false;
		this.dynamicServers = [];

		logger.info('MCP manager shutdown complete');
	}
}

// Singleton instance
export const mcpManager = new MCPManager();
