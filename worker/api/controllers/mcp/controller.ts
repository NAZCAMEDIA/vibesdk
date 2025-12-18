/**
 * MCP Servers Controller
 * Handles API endpoints for MCP server configuration management
 */

import { BaseController } from '../baseController';
import { ApiResponse, ControllerResponse } from '../types';
import { RouteContext } from '../../types/route-context';
import { MCPServersService } from '../../../database/services/MCPServersService';
import {
    MCPServersListData,
    MCPServerData,
    MCPServerMessageData,
    MCPServerTestData,
} from './types';

export class MCPServersController extends BaseController {
    /**
     * Get all user MCP servers
     * GET /api/mcp
     */
    static async getServers(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<MCPServersListData>>> {
        try {
            const user = context.user!;
            const mcpService = new MCPServersService(env);
            const servers = await mcpService.getUserServers(user.id);

            const responseData: MCPServersListData = { servers };
            return MCPServersController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error getting MCP servers:', error);
            return MCPServersController.createErrorResponse<MCPServersListData>('Failed to get MCP servers', 500);
        }
    }

    /**
     * Get a single MCP server
     * GET /api/mcp/:serverId
     */
    static async getServer(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<MCPServerData>>> {
        try {
            const user = context.user!;
            const serverId = context.pathParams.serverId;

            if (!serverId) {
                return MCPServersController.createErrorResponse<MCPServerData>('Server ID is required', 400);
            }

            const mcpService = new MCPServersService(env);
            const server = await mcpService.getServer(user.id, serverId);

            if (!server) {
                return MCPServersController.createErrorResponse<MCPServerData>('MCP server not found', 404);
            }

            const responseData: MCPServerData = { server };
            return MCPServersController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error getting MCP server:', error);
            return MCPServersController.createErrorResponse<MCPServerData>('Failed to get MCP server', 500);
        }
    }

    /**
     * Create a new MCP server
     * POST /api/mcp
     */
    static async createServer(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<MCPServerData>>> {
        try {
            const user = context.user!;

            const bodyResult = await MCPServersController.parseJsonBody<{
                name: string;
                url: string;
                transport?: 'http' | 'sse' | 'stdio';
                authType?: 'none' | 'bearer' | 'api-key';
                authSecretId?: string;
                description?: string;
                enabled?: boolean;
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<MCPServerData>>;
            }

            const { name, url, transport, authType, authSecretId, description, enabled } = bodyResult.data!;

            if (!name?.trim()) {
                return MCPServersController.createErrorResponse<MCPServerData>('Server name is required', 400);
            }

            if (!url?.trim()) {
                return MCPServersController.createErrorResponse<MCPServerData>('Server URL is required', 400);
            }

            const mcpService = new MCPServersService(env);
            const server = await mcpService.createServer(user.id, {
                name: name.trim(),
                url: url.trim(),
                transport,
                authType,
                authSecretId,
                description: description?.trim(),
                enabled,
            });

            const responseData: MCPServerData = {
                server,
                message: 'MCP server created successfully',
            };
            return MCPServersController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error creating MCP server:', error);
            return MCPServersController.createErrorResponse<MCPServerData>('Failed to create MCP server', 500);
        }
    }

    /**
     * Update an MCP server
     * PUT /api/mcp/:serverId
     */
    static async updateServer(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<MCPServerData>>> {
        try {
            const user = context.user!;
            const serverId = context.pathParams.serverId;

            if (!serverId) {
                return MCPServersController.createErrorResponse<MCPServerData>('Server ID is required', 400);
            }

            const bodyResult = await MCPServersController.parseJsonBody<{
                name?: string;
                url?: string;
                transport?: 'http' | 'sse' | 'stdio';
                authType?: 'none' | 'bearer' | 'api-key';
                authSecretId?: string | null;
                description?: string | null;
                enabled?: boolean;
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<MCPServerData>>;
            }

            const data = bodyResult.data!;

            const mcpService = new MCPServersService(env);
            const server = await mcpService.updateServer(user.id, serverId, {
                ...(data.name !== undefined && { name: data.name.trim() }),
                ...(data.url !== undefined && { url: data.url.trim() }),
                ...(data.transport !== undefined && { transport: data.transport }),
                ...(data.authType !== undefined && { authType: data.authType }),
                ...(data.authSecretId !== undefined && { authSecretId: data.authSecretId }),
                ...(data.description !== undefined && { description: data.description?.trim() }),
                ...(data.enabled !== undefined && { enabled: data.enabled }),
            });

            if (!server) {
                return MCPServersController.createErrorResponse<MCPServerData>('MCP server not found', 404);
            }

            const responseData: MCPServerData = {
                server,
                message: 'MCP server updated successfully',
            };
            return MCPServersController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error updating MCP server:', error);
            return MCPServersController.createErrorResponse<MCPServerData>('Failed to update MCP server', 500);
        }
    }

    /**
     * Delete an MCP server
     * DELETE /api/mcp/:serverId
     */
    static async deleteServer(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<MCPServerMessageData>>> {
        try {
            const user = context.user!;
            const serverId = context.pathParams.serverId;

            if (!serverId) {
                return MCPServersController.createErrorResponse<MCPServerMessageData>('Server ID is required', 400);
            }

            const mcpService = new MCPServersService(env);
            const deleted = await mcpService.deleteServer(user.id, serverId);

            if (!deleted) {
                return MCPServersController.createErrorResponse<MCPServerMessageData>('MCP server not found', 404);
            }

            const responseData: MCPServerMessageData = {
                message: 'MCP server deleted successfully',
            };
            return MCPServersController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error deleting MCP server:', error);
            return MCPServersController.createErrorResponse<MCPServerMessageData>('Failed to delete MCP server', 500);
        }
    }

    /**
     * Toggle MCP server enabled status
     * PATCH /api/mcp/:serverId/toggle
     */
    static async toggleServer(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<MCPServerData>>> {
        try {
            const user = context.user!;
            const serverId = context.pathParams.serverId;

            if (!serverId) {
                return MCPServersController.createErrorResponse<MCPServerData>('Server ID is required', 400);
            }

            const mcpService = new MCPServersService(env);
            const server = await mcpService.toggleServer(user.id, serverId);

            if (!server) {
                return MCPServersController.createErrorResponse<MCPServerData>('MCP server not found', 404);
            }

            const responseData: MCPServerData = {
                server,
                message: `MCP server ${server.enabled ? 'enabled' : 'disabled'} successfully`,
            };
            return MCPServersController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error toggling MCP server:', error);
            return MCPServersController.createErrorResponse<MCPServerData>('Failed to toggle MCP server', 500);
        }
    }

    /**
     * Test connection to an MCP server
     * POST /api/mcp/:serverId/test
     */
    static async testConnection(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<MCPServerTestData>>> {
        try {
            const user = context.user!;
            const serverId = context.pathParams.serverId;

            if (!serverId) {
                return MCPServersController.createErrorResponse<MCPServerTestData>('Server ID is required', 400);
            }

            const mcpService = new MCPServersService(env);
            const server = await mcpService.getServer(user.id, serverId);

            if (!server) {
                return MCPServersController.createErrorResponse<MCPServerTestData>('MCP server not found', 404);
            }

            // Test connection
            const startTime = Date.now();
            let status: 'connected' | 'disconnected' | 'error' = 'error';
            let message = 'Unknown error';
            let latencyMs: number | undefined;

            try {
                // Try to fetch the server URL (health check or root)
                const testUrl = server.url.endsWith('/health')
                    ? server.url
                    : `${server.url.replace(/\/$/, '')}/health`;

                const response = await fetch(testUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000), // 5 second timeout
                });

                latencyMs = Date.now() - startTime;

                if (response.ok) {
                    status = 'connected';
                    message = `Connected successfully (${latencyMs}ms)`;
                } else {
                    status = 'error';
                    message = `Server returned status ${response.status}`;
                }
            } catch (fetchError) {
                latencyMs = Date.now() - startTime;
                status = 'disconnected';
                message = fetchError instanceof Error ? fetchError.message : 'Connection failed';
            }

            // Update server status in database
            await mcpService.updateServerStatus(
                user.id,
                serverId,
                status,
                status === 'error' || status === 'disconnected' ? message : null
            );

            const responseData: MCPServerTestData = {
                success: status === 'connected',
                status,
                message,
                latencyMs,
            };
            return MCPServersController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error testing MCP server connection:', error);
            return MCPServersController.createErrorResponse<MCPServerTestData>(
                'Failed to test MCP server connection',
                500
            );
        }
    }
}
