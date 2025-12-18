/**
 * MCP Configuration Page
 * Manage Model Context Protocol server configurations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Server,
  Trash2,
  Edit2,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  Key,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { MCPServer as APIMCPServer } from '@/api-types';

interface MCPServer {
  id: string;
  name: string;
  url: string;
  transport: 'http' | 'stdio' | 'sse';
  authType: 'none' | 'bearer' | 'api-key';
  authToken?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  lastChecked?: Date;
  description?: string;
}

export default function MCPConfigPage() {
  const { user } = useAuth();
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    transport: 'http' as MCPServer['transport'],
    authType: 'none' as MCPServer['authType'],
    authToken: '',
    description: '',
    enabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Helper to convert API server to local format
  const mapApiServer = (s: APIMCPServer): MCPServer => ({
    id: s.id,
    name: s.name,
    url: s.url,
    transport: (s.transport as MCPServer['transport']) || 'http',
    authType: (s.authType as MCPServer['authType']) || 'none',
    enabled: s.enabled ?? true,
    status: (s.status as MCPServer['status']) || 'unknown',
    lastChecked: s.lastChecked ? new Date(s.lastChecked) : undefined,
    description: s.description || undefined,
  });

  // Helper to extract error message
  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as { message: string }).message;
    }
    return 'An error occurred';
  };

  // Load servers
  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMCPServers();
      if (response.success && response.data) {
        setServers(response.data.servers.map(mapApiServer));
      }
    } catch (error) {
      console.error('Error loading MCP servers:', error);
      toast.error('Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadServers();
    }
  }, [user, loadServers]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      transport: 'http',
      authType: 'none',
      authToken: '',
      description: '',
      enabled: true,
    });
  };

  // Add server
  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiClient.createMCPServer({
        name: formData.name.trim(),
        url: formData.url.trim(),
        transport: formData.transport,
        authType: formData.authType,
        description: formData.description.trim() || undefined,
        enabled: formData.enabled,
      });

      if (response.success && response.data) {
        const newServer = mapApiServer(response.data.server);
        setServers(prev => [...prev, newServer]);
        setIsAddDialogOpen(false);
        resetForm();
        toast.success('MCP server added successfully');
      } else {
        toast.error(getErrorMessage(response.error) || 'Failed to add server');
      }
    } catch (error) {
      console.error('Error adding server:', error);
      toast.error('Failed to add server');
    } finally {
      setIsSaving(false);
    }
  };

  // Update server
  const handleUpdate = async () => {
    if (!selectedServer || !formData.name.trim() || !formData.url.trim()) {
      toast.error('Name and URL are required');
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiClient.updateMCPServer(selectedServer.id, {
        name: formData.name.trim(),
        url: formData.url.trim(),
        transport: formData.transport,
        authType: formData.authType,
        description: formData.description.trim() || undefined,
        enabled: formData.enabled,
      });

      if (response.success && response.data) {
        const updatedServer = mapApiServer(response.data.server);
        setServers(prev => prev.map(s =>
          s.id === selectedServer.id ? updatedServer : s
        ));
        setIsEditDialogOpen(false);
        setSelectedServer(null);
        resetForm();
        toast.success('MCP server updated successfully');
      } else {
        toast.error(getErrorMessage(response.error) || 'Failed to update server');
      }
    } catch (error) {
      console.error('Error updating server:', error);
      toast.error('Failed to update server');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete server
  const handleDelete = async () => {
    if (!selectedServer) return;

    try {
      const response = await apiClient.deleteMCPServer(selectedServer.id);
      if (response.success) {
        setServers(prev => prev.filter(s => s.id !== selectedServer.id));
        setIsDeleteDialogOpen(false);
        setSelectedServer(null);
        toast.success('MCP server removed successfully');
      } else {
        toast.error(getErrorMessage(response.error) || 'Failed to remove server');
      }
    } catch (error) {
      console.error('Error deleting server:', error);
      toast.error('Failed to remove server');
    }
  };

  // Toggle server enabled
  const handleToggleEnabled = async (server: MCPServer) => {
    try {
      const response = await apiClient.toggleMCPServer(server.id);
      if (response.success && response.data) {
        const updatedServer = mapApiServer(response.data.server);
        setServers(prev => prev.map(s =>
          s.id === server.id ? updatedServer : s
        ));
        toast.success(`Server ${updatedServer.enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error(getErrorMessage(response.error) || 'Failed to update server');
      }
    } catch (error) {
      console.error('Error toggling server:', error);
      toast.error('Failed to update server');
    }
  };

  // Test connection
  const handleTestConnection = async (server: MCPServer) => {
    setTestingConnection(server.id);
    try {
      const response = await apiClient.testMCPServer(server.id);

      if (response.success && response.data) {
        const { success, status, message } = response.data;
        setServers(prev => prev.map(s =>
          s.id === server.id
            ? { ...s, status: status as MCPServer['status'], lastChecked: new Date() }
            : s
        ));

        if (success) {
          toast.success(message || `Connected to ${server.name}`);
        } else {
          toast.error(message || `Failed to connect to ${server.name}`);
        }
      } else {
        toast.error(getErrorMessage(response.error) || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setServers(prev => prev.map(s =>
        s.id === server.id ? { ...s, status: 'error', lastChecked: new Date() } : s
      ));
      toast.error('Connection test failed');
    } finally {
      setTestingConnection(null);
    }
  };

  // Open edit dialog
  const openEditDialog = (server: MCPServer) => {
    setSelectedServer(server);
    setFormData({
      name: server.name,
      url: server.url,
      transport: server.transport,
      authType: server.authType,
      authToken: server.authToken || '',
      description: server.description || '',
      enabled: server.enabled,
    });
    setIsEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (server: MCPServer) => {
    setSelectedServer(server);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Unknown
          </Badge>
        );
    }
  };

  const getTransportIcon = (transport: MCPServer['transport']) => {
    switch (transport) {
      case 'http':
        return <Globe className="h-4 w-4" />;
      case 'sse':
        return <Link2 className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-3 relative">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold font-[departureMono] text-accent">
                MCP SERVERS
              </h1>
              <p className="text-text-tertiary mt-2">
                Configure Model Context Protocol servers for AI agent integration
              </p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-accent hover:bg-accent/90">
              <Plus className="h-4 w-4" />
              Add Server
            </Button>
          </div>

          {/* Info Card */}
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Server className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-1">About MCP Servers</h3>
                  <p className="text-sm text-text-tertiary">
                    MCP (Model Context Protocol) servers extend AI capabilities by providing tools,
                    resources, and context. Connect servers to enable project management, code analysis,
                    database access, and more.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Servers List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-text-tertiary">Loading servers...</div>
            </div>
          ) : servers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-12 w-12 text-text-tertiary mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No MCP servers configured
                </h3>
                <p className="text-text-tertiary text-center mb-4">
                  Add your first MCP server to extend AI capabilities
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Server
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {servers.map((server) => (
                <Card key={server.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-bg-2 rounded-lg">
                          {getTransportIcon(server.transport)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{server.name}</CardTitle>
                          <p className="text-sm text-text-tertiary font-mono">{server.url}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={server.enabled}
                        onCheckedChange={() => handleToggleEnabled(server)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTestConnection(server)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Test Connection
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(server)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(server)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {server.description && (
                      <p className="text-sm text-text-tertiary mb-4">{server.description}</p>
                    )}
                    <div className="flex items-center gap-4 flex-wrap">
                      {testingConnection === server.id ? (
                        <Badge variant="secondary">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Testing...
                        </Badge>
                      ) : (
                        getStatusBadge(server.status)
                      )}
                      <Badge variant="outline" className="capitalize">
                        {server.transport}
                      </Badge>
                      {server.authType !== 'none' && (
                        <Badge variant="outline">
                          <Key className="h-3 w-3 mr-1" />
                          {server.authType === 'bearer' ? 'Bearer Token' : 'API Key'}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add MCP Server</DialogTitle>
            <DialogDescription>
              Configure a new Model Context Protocol server
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                placeholder="My MCP Server"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="url">Server URL</Label>
              <Input
                id="url"
                placeholder="https://example.com/mcp"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="transport">Transport</Label>
              <Select
                value={formData.transport}
                onValueChange={(value: MCPServer['transport']) =>
                  setFormData(prev => ({ ...prev, transport: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                  <SelectItem value="stdio">Stdio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="authType">Authentication</Label>
              <Select
                value={formData.authType}
                onValueChange={(value: MCPServer['authType']) =>
                  setFormData(prev => ({ ...prev, authType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api-key">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.authType !== 'none' && (
              <div>
                <Label htmlFor="authToken">
                  {formData.authType === 'bearer' ? 'Bearer Token' : 'API Key'}
                </Label>
                <Input
                  id="authToken"
                  type="password"
                  placeholder="Enter token..."
                  value={formData.authToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                />
              </div>
            )}
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this server"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="enabled">Enable server</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving ? 'Adding...' : 'Add Server'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit MCP Server</DialogTitle>
            <DialogDescription>
              Update server configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Server Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-url">Server URL</Label>
              <Input
                id="edit-url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-transport">Transport</Label>
              <Select
                value={formData.transport}
                onValueChange={(value: MCPServer['transport']) =>
                  setFormData(prev => ({ ...prev, transport: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                  <SelectItem value="stdio">Stdio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-authType">Authentication</Label>
              <Select
                value={formData.authType}
                onValueChange={(value: MCPServer['authType']) =>
                  setFormData(prev => ({ ...prev, authType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="bearer">Bearer Token</SelectItem>
                  <SelectItem value="api-key">API Key</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.authType !== 'none' && (
              <div>
                <Label htmlFor="edit-authToken">
                  {formData.authType === 'bearer' ? 'Bearer Token' : 'API Key'}
                </Label>
                <Input
                  id="edit-authToken"
                  type="password"
                  placeholder="Enter new token or leave to keep existing"
                  value={formData.authToken}
                  onChange={(e) => setFormData(prev => ({ ...prev, authToken: e.target.value }))}
                />
              </div>
            )}
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove MCP Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{selectedServer?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
