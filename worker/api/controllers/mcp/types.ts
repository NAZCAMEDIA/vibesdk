/**
 * Type definitions for MCP Servers Controller responses
 */

import type { MCPServer } from '../../../database/schema';

/**
 * Response data for getMCPServers
 */
export interface MCPServersListData {
    servers: MCPServer[];
}

/**
 * Response data for single server operations
 */
export interface MCPServerData {
    server: MCPServer;
    message?: string;
}

/**
 * Simple message response
 */
export interface MCPServerMessageData {
    message: string;
}

/**
 * Response data for connection test
 */
export interface MCPServerTestData {
    success: boolean;
    status: 'connected' | 'disconnected' | 'error';
    message: string;
    latencyMs?: number;
}
