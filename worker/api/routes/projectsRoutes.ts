/**
 * Projects Routes
 * Setup routes for project management
 */

import { ProjectsController } from '../controllers/projects/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup project management routes
 */
export function setupProjectsRoutes(app: Hono<AppEnv>): void {
    const projectsRouter = new Hono<AppEnv>();

    // All routes require authentication
    // GET /api/projects - List all user projects
    projectsRouter.get(
        '/',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.getProjects)
    );

    // POST /api/projects - Create a new project
    projectsRouter.post(
        '/',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.createProject)
    );

    // GET /api/projects/:projectId - Get single project
    projectsRouter.get(
        '/:projectId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.getProject)
    );

    // PUT /api/projects/:projectId - Update project
    projectsRouter.put(
        '/:projectId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.updateProject)
    );

    // DELETE /api/projects/:projectId - Delete project
    projectsRouter.delete(
        '/:projectId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.deleteProject)
    );

    // GET /api/projects/:projectId/apps - Get apps in project
    projectsRouter.get(
        '/:projectId/apps',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.getProjectApps)
    );

    // POST /api/projects/:projectId/apps/:appId - Add app to project
    projectsRouter.post(
        '/:projectId/apps/:appId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.addAppToProject)
    );

    // DELETE /api/projects/:projectId/apps/:appId - Remove app from project
    projectsRouter.delete(
        '/:projectId/apps/:appId',
        setAuthLevel(AuthConfig.authenticated),
        adaptController(ProjectsController, ProjectsController.removeAppFromProject)
    );

    // Mount under /api/projects
    app.route('/api/projects', projectsRouter);
}
