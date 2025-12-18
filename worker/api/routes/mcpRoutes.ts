/**
 * MCP Servers Routes
 * Setup routes for MCP server configuration management
 */

import { MCPServersController } from '../controllers/mcp/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup MCP server management routes
 */
export function setupMCPRoutes(app: Hono<AppEnv>): void {
    const mcpRouter = new Hono<AppEnv>();

    // All routes require authentication
    // GET /api/mcp - List all user MCP servers
    mcpRouter.get(
        '/',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(MCPServersController, MCPServersController.getServers)
    );

    // POST /api/mcp - Create a new MCP server
    mcpRouter.post(
        '/',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(MCPServersController, MCPServersController.createServer)
    );

    // GET /api/mcp/:serverId - Get single MCP server
    mcpRouter.get(
        '/:serverId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(MCPServersController, MCPServersController.getServer)
    );

    // PUT /api/mcp/:serverId - Update MCP server
    mcpRouter.put(
        '/:serverId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(MCPServersController, MCPServersController.updateServer)
    );

    // DELETE /api/mcp/:serverId - Delete MCP server
    mcpRouter.delete(
        '/:serverId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(MCPServersController, MCPServersController.deleteServer)
    );

    // PATCH /api/mcp/:serverId/toggle - Toggle enabled status
    mcpRouter.patch(
        '/:serverId/toggle',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(MCPServersController, MCPServersController.toggleServer)
    );

    // POST /api/mcp/:serverId/test - Test connection
    mcpRouter.post(
        '/:serverId/test',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(MCPServersController, MCPServersController.testConnection)
    );

    // Mount under /api/mcp
    app.route('/api/mcp', mcpRouter);
}
