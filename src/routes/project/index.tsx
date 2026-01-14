/**
 * Project Detail View
 * Shows the project info and its apps
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, FolderOpen, Plus, Loader2, Calendar, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { ProjectData, ProjectAppsData } from '@/api-types';
import { formatDistanceToNow } from 'date-fns';

// App type from the API response
type ProjectApp = ProjectAppsData['apps'][number];

export default function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectData['project'] | null>(null);
  const [apps, setApps] = useState<ProjectApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project and its apps
  const loadProject = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch project details and apps in parallel
      const [projectResponse, appsResponse] = await Promise.all([
        apiClient.getProject(id),
        apiClient.getProjectApps(id),
      ]);

      if (projectResponse.success && projectResponse.data) {
        setProject(projectResponse.data.project);
      } else {
        throw new Error('Failed to load project');
      }

      if (appsResponse.success && appsResponse.data) {
        setApps(appsResponse.data.apps || []);
      }
    } catch (err) {
      console.error('Error loading project:', err);
      setError('Failed to load project');
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-3 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-bg-3">
        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <Button
            variant="ghost"
            onClick={() => navigate('/projects')}
            className="mb-6 gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
            <h2 className="text-lg font-medium text-text-primary mb-2">
              Project not found
            </h2>
            <p className="text-text-tertiary">
              The project you're looking for doesn't exist or you don't have access.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-3">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/projects')}
          className="mb-6 gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        {/* Project Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold font-[departureMono] text-accent mb-2">
                {project.name}
              </h1>
              {project.description && (
                <p className="text-text-tertiary text-lg mb-3">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={getStatusColor(project.status || 'draft')}>
                  {project.status || 'draft'}
                </Badge>
                <span className="text-text-tertiary text-sm">
                  {apps.length} app{apps.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <Button
              onClick={() => navigate('/')}
              className="gap-2 bg-accent hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              New App
            </Button>
          </div>
        </div>

        {/* Apps List */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-text-primary">
            Apps in this project
          </h2>

          {apps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-text-tertiary mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  No apps in this project
                </h3>
                <p className="text-text-tertiary text-center mb-4">
                  Create your first app and add it to this project.
                </p>
                <Button onClick={() => navigate('/')} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create App
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app) => (
                <Card
                  key={app.id}
                  className="hover:shadow-md transition-shadow cursor-pointer hover:border-accent/50"
                  onClick={() => navigate(`/app/${app.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {app.iconUrl ? (
                        <img
                          src={app.iconUrl}
                          alt={app.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
                          <FolderOpen className="h-6 w-6 text-accent" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-text-primary truncate">
                          {app.title}
                        </h3>
                        {app.description && (
                          <p className="text-sm text-text-tertiary line-clamp-2 mt-1">
                            {app.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {app.createdAt && formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {app.visibility || 'private'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
