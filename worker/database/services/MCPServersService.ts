/**
 * MCP Servers Service
 * Handles database operations for user MCP server configurations
 */

import { BaseService } from './BaseService';
import * as schema from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateId } from '../../utils/idGenerator';

export interface MCPServerInput {
    name: string;
    url: string;
    transport?: 'http' | 'sse' | 'stdio';
    authType?: 'none' | 'bearer' | 'api-key';
    authSecretId?: string | null;
    description?: string | null;
    enabled?: boolean;
}

export class MCPServersService extends BaseService {
    /**
     * Create a new MCP server configuration
     */
    async createServer(userId: string, data: MCPServerInput): Promise<schema.MCPServer> {
        try {
            const newServer: schema.NewMCPServer = {
                id: generateId(),
                userId,
                name: data.name,
                url: data.url,
                transport: data.transport ?? 'http',
                authType: data.authType ?? 'none',
                authSecretId: data.authSecretId ?? null,
                description: data.description ?? null,
                enabled: data.enabled ?? true,
                status: 'unknown',
                lastChecked: null,
                lastError: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await this.database.insert(schema.mcpServers).values(newServer);

            const [server] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(eq(schema.mcpServers.id, newServer.id))
                .limit(1);

            this.logger.info('MCP Server created', { userId, serverId: newServer.id });

            return server;
        } catch (error) {
            this.handleDatabaseError(error, 'createServer', { userId });
        }
    }

    /**
     * Get all MCP servers for a user
     */
    async getUserServers(userId: string): Promise<schema.MCPServer[]> {
        try {
            const servers = await this.database
                .select()
                .from(schema.mcpServers)
                .where(eq(schema.mcpServers.userId, userId))
                .orderBy(desc(schema.mcpServers.createdAt));

            return servers;
        } catch (error) {
            this.handleDatabaseError(error, 'getUserServers', { userId });
        }
    }

    /**
     * Get a single MCP server by ID (with ownership check)
     */
    async getServer(userId: string, serverId: string): Promise<schema.MCPServer | null> {
        try {
            const [server] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(
                    and(
                        eq(schema.mcpServers.id, serverId),
                        eq(schema.mcpServers.userId, userId)
                    )
                )
                .limit(1);

            return server ?? null;
        } catch (error) {
            this.handleDatabaseError(error, 'getServer', { userId, serverId });
        }
    }

    /**
     * Update an MCP server configuration
     */
    async updateServer(
        userId: string,
        serverId: string,
        data: Partial<MCPServerInput>
    ): Promise<schema.MCPServer | null> {
        try {
            // Verify ownership
            const [existing] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(
                    and(
                        eq(schema.mcpServers.id, serverId),
                        eq(schema.mcpServers.userId, userId)
                    )
                )
                .limit(1);

            if (!existing) {
                return null;
            }

            // Update
            await this.database
                .update(schema.mcpServers)
                .set({
                    ...(data.name !== undefined && { name: data.name }),
                    ...(data.url !== undefined && { url: data.url }),
                    ...(data.transport !== undefined && { transport: data.transport }),
                    ...(data.authType !== undefined && { authType: data.authType }),
                    ...(data.authSecretId !== undefined && { authSecretId: data.authSecretId }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.enabled !== undefined && { enabled: data.enabled }),
                    updatedAt: new Date(),
                })
                .where(eq(schema.mcpServers.id, serverId));

            // Return updated
            const [updated] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(eq(schema.mcpServers.id, serverId))
                .limit(1);

            this.logger.info('MCP Server updated', { userId, serverId });

            return updated;
        } catch (error) {
            this.handleDatabaseError(error, 'updateServer', { userId, serverId });
        }
    }

    /**
     * Delete an MCP server configuration
     */
    async deleteServer(userId: string, serverId: string): Promise<boolean> {
        try {
            // Verify ownership
            const [existing] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(
                    and(
                        eq(schema.mcpServers.id, serverId),
                        eq(schema.mcpServers.userId, userId)
                    )
                )
                .limit(1);

            if (!existing) {
                return false;
            }

            // Delete
            await this.database
                .delete(schema.mcpServers)
                .where(eq(schema.mcpServers.id, serverId));

            this.logger.info('MCP Server deleted', { userId, serverId });

            return true;
        } catch (error) {
            this.handleDatabaseError(error, 'deleteServer', { userId, serverId });
        }
    }

    /**
     * Update server connection status
     */
    async updateServerStatus(
        userId: string,
        serverId: string,
        status: 'connected' | 'disconnected' | 'error' | 'unknown',
        error?: string | null
    ): Promise<schema.MCPServer | null> {
        try {
            // Verify ownership
            const [existing] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(
                    and(
                        eq(schema.mcpServers.id, serverId),
                        eq(schema.mcpServers.userId, userId)
                    )
                )
                .limit(1);

            if (!existing) {
                return null;
            }

            // Update status
            await this.database
                .update(schema.mcpServers)
                .set({
                    status,
                    lastChecked: new Date(),
                    lastError: error ?? null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.mcpServers.id, serverId));

            // Return updated
            const [updated] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(eq(schema.mcpServers.id, serverId))
                .limit(1);

            return updated;
        } catch (error) {
            this.handleDatabaseError(error, 'updateServerStatus', { userId, serverId });
        }
    }

    /**
     * Toggle server enabled status
     */
    async toggleServer(userId: string, serverId: string): Promise<schema.MCPServer | null> {
        try {
            // Get current status
            const [existing] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(
                    and(
                        eq(schema.mcpServers.id, serverId),
                        eq(schema.mcpServers.userId, userId)
                    )
                )
                .limit(1);

            if (!existing) {
                return null;
            }

            // Toggle
            await this.database
                .update(schema.mcpServers)
                .set({
                    enabled: !existing.enabled,
                    updatedAt: new Date(),
                })
                .where(eq(schema.mcpServers.id, serverId));

            // Return updated
            const [updated] = await this.database
                .select()
                .from(schema.mcpServers)
                .where(eq(schema.mcpServers.id, serverId))
                .limit(1);

            this.logger.info('MCP Server toggled', {
                userId,
                serverId,
                enabled: updated.enabled
            });

            return updated;
        } catch (error) {
            this.handleDatabaseError(error, 'toggleServer', { userId, serverId });
        }
    }

    /**
     * Get all enabled servers for a user
     */
    async getEnabledServers(userId: string): Promise<schema.MCPServer[]> {
        try {
            const servers = await this.database
                .select()
                .from(schema.mcpServers)
                .where(
                    and(
                        eq(schema.mcpServers.userId, userId),
                        eq(schema.mcpServers.enabled, true)
                    )
                )
                .orderBy(desc(schema.mcpServers.createdAt));

            return servers;
        } catch (error) {
            this.handleDatabaseError(error, 'getEnabledServers', { userId });
        }
    }
}
