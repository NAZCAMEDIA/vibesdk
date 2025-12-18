/**
 * Projects Controller
 * Handles API endpoints for user project management
 */

import { BaseController } from '../baseController';
import { ApiResponse, ControllerResponse } from '../types';
import { RouteContext } from '../../types/route-context';
import { ProjectsService } from '../../../database/services/ProjectsService';
import {
    ProjectsListData,
    ProjectData,
    ProjectAppsData,
    ProjectMessageData,
} from './types';

export class ProjectsController extends BaseController {
    /**
     * Get all user projects
     * GET /api/projects
     */
    static async getProjects(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectsListData>>> {
        try {
            const user = context.user!;
            const projectsService = new ProjectsService(env);
            const projects = await projectsService.getUserProjects(user.id);

            const responseData: ProjectsListData = { projects };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error getting user projects:', error);
            return ProjectsController.createErrorResponse<ProjectsListData>('Failed to get projects', 500);
        }
    }

    /**
     * Get a single project
     * GET /api/projects/:projectId
     */
    static async getProject(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectData>>> {
        try {
            const user = context.user!;
            const projectId = context.pathParams.projectId;

            if (!projectId) {
                return ProjectsController.createErrorResponse<ProjectData>('Project ID is required', 400);
            }

            const projectsService = new ProjectsService(env);
            const project = await projectsService.getProject(user.id, projectId);

            if (!project) {
                return ProjectsController.createErrorResponse<ProjectData>('Project not found', 404);
            }

            const responseData: ProjectData = { project };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error getting project:', error);
            return ProjectsController.createErrorResponse<ProjectData>('Failed to get project', 500);
        }
    }

    /**
     * Create a new project
     * POST /api/projects
     */
    static async createProject(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectData>>> {
        try {
            const user = context.user!;

            const bodyResult = await ProjectsController.parseJsonBody<{
                name: string;
                description?: string;
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<ProjectData>>;
            }

            const { name, description } = bodyResult.data!;

            if (!name?.trim()) {
                return ProjectsController.createErrorResponse<ProjectData>('Project name is required', 400);
            }

            const projectsService = new ProjectsService(env);
            const project = await projectsService.createProject(user.id, {
                name: name.trim(),
                description: description?.trim(),
            });

            const responseData: ProjectData = {
                project: { ...project, appCount: 0 },
                message: 'Project created successfully',
            };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error creating project:', error);
            return ProjectsController.createErrorResponse<ProjectData>('Failed to create project', 500);
        }
    }

    /**
     * Update a project
     * PUT /api/projects/:projectId
     */
    static async updateProject(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectData>>> {
        try {
            const user = context.user!;
            const projectId = context.pathParams.projectId;

            if (!projectId) {
                return ProjectsController.createErrorResponse<ProjectData>('Project ID is required', 400);
            }

            const bodyResult = await ProjectsController.parseJsonBody<{
                name?: string;
                description?: string;
                status?: 'active' | 'archived' | 'draft';
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<ProjectData>>;
            }

            const { name, description, status } = bodyResult.data!;

            const projectsService = new ProjectsService(env);
            const project = await projectsService.updateProject(user.id, projectId, {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() }),
                ...(status !== undefined && { status }),
            });

            if (!project) {
                return ProjectsController.createErrorResponse<ProjectData>('Project not found', 404);
            }

            const responseData: ProjectData = {
                project,
                message: 'Project updated successfully',
            };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error updating project:', error);
            return ProjectsController.createErrorResponse<ProjectData>('Failed to update project', 500);
        }
    }

    /**
     * Delete a project
     * DELETE /api/projects/:projectId
     */
    static async deleteProject(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectMessageData>>> {
        try {
            const user = context.user!;
            const projectId = context.pathParams.projectId;

            if (!projectId) {
                return ProjectsController.createErrorResponse<ProjectMessageData>('Project ID is required', 400);
            }

            const projectsService = new ProjectsService(env);
            const deleted = await projectsService.deleteProject(user.id, projectId);

            if (!deleted) {
                return ProjectsController.createErrorResponse<ProjectMessageData>('Project not found', 404);
            }

            const responseData: ProjectMessageData = {
                message: 'Project deleted successfully',
            };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error deleting project:', error);
            return ProjectsController.createErrorResponse<ProjectMessageData>('Failed to delete project', 500);
        }
    }

    /**
     * Get apps in a project
     * GET /api/projects/:projectId/apps
     */
    static async getProjectApps(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectAppsData>>> {
        try {
            const user = context.user!;
            const projectId = context.pathParams.projectId;

            if (!projectId) {
                return ProjectsController.createErrorResponse<ProjectAppsData>('Project ID is required', 400);
            }

            const projectsService = new ProjectsService(env);
            const apps = await projectsService.getProjectApps(user.id, projectId);

            const responseData: ProjectAppsData = { apps };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error getting project apps:', error);
            return ProjectsController.createErrorResponse<ProjectAppsData>('Failed to get project apps', 500);
        }
    }

    /**
     * Add an app to a project
     * POST /api/projects/:projectId/apps/:appId
     */
    static async addAppToProject(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectMessageData>>> {
        try {
            const user = context.user!;
            const { projectId, appId } = context.pathParams;

            if (!projectId || !appId) {
                return ProjectsController.createErrorResponse<ProjectMessageData>(
                    'Project ID and App ID are required',
                    400
                );
            }

            const projectsService = new ProjectsService(env);
            const success = await projectsService.addAppToProject(user.id, projectId, appId);

            if (!success) {
                return ProjectsController.createErrorResponse<ProjectMessageData>(
                    'Project or app not found',
                    404
                );
            }

            const responseData: ProjectMessageData = {
                message: 'App added to project successfully',
            };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error adding app to project:', error);
            return ProjectsController.createErrorResponse<ProjectMessageData>(
                'Failed to add app to project',
                500
            );
        }
    }

    /**
     * Remove an app from a project
     * DELETE /api/projects/:projectId/apps/:appId
     */
    static async removeAppFromProject(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<ProjectMessageData>>> {
        try {
            const user = context.user!;
            const { projectId, appId } = context.pathParams;

            if (!projectId || !appId) {
                return ProjectsController.createErrorResponse<ProjectMessageData>(
                    'Project ID and App ID are required',
                    400
                );
            }

            const projectsService = new ProjectsService(env);
            const success = await projectsService.removeAppFromProject(user.id, projectId, appId);

            if (!success) {
                return ProjectsController.createErrorResponse<ProjectMessageData>(
                    'Project not found',
                    404
                );
            }

            const responseData: ProjectMessageData = {
                message: 'App removed from project successfully',
            };
            return ProjectsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error removing app from project:', error);
            return ProjectsController.createErrorResponse<ProjectMessageData>(
                'Failed to remove app from project',
                500
            );
        }
    }
}
