/**
 * Projects Service
 * Handles database operations for user projects
 */

import { BaseService } from './BaseService';
import * as schema from '../schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { generateId } from '../../utils/idGenerator';

export interface ProjectWithAppCount {
    id: string;
    userId: string;
    name: string;
    description: string | null;
    status: 'active' | 'archived' | 'draft';
    createdAt: Date | null;
    updatedAt: Date | null;
    appCount: number;
}

export class ProjectsService extends BaseService {
    /**
     * Create a new project
     */
    async createProject(userId: string, data: { name: string; description?: string }): Promise<schema.Project> {
        try {
            const newProject: schema.NewProject = {
                id: generateId(),
                userId,
                name: data.name,
                description: data.description ?? null,
                status: 'draft',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await this.database.insert(schema.projects).values(newProject);

            const [project] = await this.database
                .select()
                .from(schema.projects)
                .where(eq(schema.projects.id, newProject.id))
                .limit(1);

            this.logger.info('Project created', { userId, projectId: newProject.id });

            return project;
        } catch (error) {
            this.handleDatabaseError(error, 'createProject', { userId });
        }
    }

    /**
     * Get all projects for a user with app counts
     */
    async getUserProjects(userId: string): Promise<ProjectWithAppCount[]> {
        try {
            // Get projects
            const projects = await this.database
                .select()
                .from(schema.projects)
                .where(eq(schema.projects.userId, userId))
                .orderBy(desc(schema.projects.updatedAt));

            // Get app counts for each project
            const projectsWithCounts: ProjectWithAppCount[] = [];

            for (const project of projects) {
                const [countResult] = await this.database
                    .select({ count: count() })
                    .from(schema.projectApps)
                    .where(eq(schema.projectApps.projectId, project.id));

                projectsWithCounts.push({
                    ...project,
                    appCount: countResult?.count ?? 0,
                });
            }

            return projectsWithCounts;
        } catch (error) {
            this.handleDatabaseError(error, 'getUserProjects', { userId });
        }
    }

    /**
     * Get a single project by ID (with ownership check)
     */
    async getProject(userId: string, projectId: string): Promise<ProjectWithAppCount | null> {
        try {
            const [project] = await this.database
                .select()
                .from(schema.projects)
                .where(
                    and(
                        eq(schema.projects.id, projectId),
                        eq(schema.projects.userId, userId)
                    )
                )
                .limit(1);

            if (!project) {
                return null;
            }

            const [countResult] = await this.database
                .select({ count: count() })
                .from(schema.projectApps)
                .where(eq(schema.projectApps.projectId, projectId));

            return {
                ...project,
                appCount: countResult?.count ?? 0,
            };
        } catch (error) {
            this.handleDatabaseError(error, 'getProject', { userId, projectId });
        }
    }

    /**
     * Update a project
     */
    async updateProject(
        userId: string,
        projectId: string,
        data: { name?: string; description?: string; status?: 'active' | 'archived' | 'draft' }
    ): Promise<schema.Project | null> {
        try {
            // Verify ownership
            const [existing] = await this.database
                .select()
                .from(schema.projects)
                .where(
                    and(
                        eq(schema.projects.id, projectId),
                        eq(schema.projects.userId, userId)
                    )
                )
                .limit(1);

            if (!existing) {
                return null;
            }

            // Update
            await this.database
                .update(schema.projects)
                .set({
                    ...(data.name !== undefined && { name: data.name }),
                    ...(data.description !== undefined && { description: data.description }),
                    ...(data.status !== undefined && { status: data.status }),
                    updatedAt: new Date(),
                })
                .where(eq(schema.projects.id, projectId));

            // Return updated
            const [updated] = await this.database
                .select()
                .from(schema.projects)
                .where(eq(schema.projects.id, projectId))
                .limit(1);

            this.logger.info('Project updated', { userId, projectId });

            return updated;
        } catch (error) {
            this.handleDatabaseError(error, 'updateProject', { userId, projectId });
        }
    }

    /**
     * Delete a project
     */
    async deleteProject(userId: string, projectId: string): Promise<boolean> {
        try {
            // Verify ownership
            const [existing] = await this.database
                .select()
                .from(schema.projects)
                .where(
                    and(
                        eq(schema.projects.id, projectId),
                        eq(schema.projects.userId, userId)
                    )
                )
                .limit(1);

            if (!existing) {
                return false;
            }

            // Delete (cascade will handle project_apps)
            await this.database
                .delete(schema.projects)
                .where(eq(schema.projects.id, projectId));

            this.logger.info('Project deleted', { userId, projectId });

            return true;
        } catch (error) {
            this.handleDatabaseError(error, 'deleteProject', { userId, projectId });
        }
    }

    /**
     * Add an app to a project
     */
    async addAppToProject(userId: string, projectId: string, appId: string): Promise<boolean> {
        try {
            // Verify project ownership
            const [project] = await this.database
                .select()
                .from(schema.projects)
                .where(
                    and(
                        eq(schema.projects.id, projectId),
                        eq(schema.projects.userId, userId)
                    )
                )
                .limit(1);

            if (!project) {
                return false;
            }

            // Verify app ownership
            const [app] = await this.database
                .select()
                .from(schema.apps)
                .where(
                    and(
                        eq(schema.apps.id, appId),
                        eq(schema.apps.userId, userId)
                    )
                )
                .limit(1);

            if (!app) {
                return false;
            }

            // Check if already linked
            const [existing] = await this.database
                .select()
                .from(schema.projectApps)
                .where(
                    and(
                        eq(schema.projectApps.projectId, projectId),
                        eq(schema.projectApps.appId, appId)
                    )
                )
                .limit(1);

            if (existing) {
                return true; // Already linked
            }

            // Add link
            await this.database.insert(schema.projectApps).values({
                id: generateId(),
                projectId,
                appId,
                addedAt: new Date(),
            });

            this.logger.info('App added to project', { userId, projectId, appId });

            return true;
        } catch (error) {
            this.handleDatabaseError(error, 'addAppToProject', { userId, projectId, appId });
        }
    }

    /**
     * Remove an app from a project
     */
    async removeAppFromProject(userId: string, projectId: string, appId: string): Promise<boolean> {
        try {
            // Verify project ownership
            const [project] = await this.database
                .select()
                .from(schema.projects)
                .where(
                    and(
                        eq(schema.projects.id, projectId),
                        eq(schema.projects.userId, userId)
                    )
                )
                .limit(1);

            if (!project) {
                return false;
            }

            // Remove link
            await this.database
                .delete(schema.projectApps)
                .where(
                    and(
                        eq(schema.projectApps.projectId, projectId),
                        eq(schema.projectApps.appId, appId)
                    )
                );

            this.logger.info('App removed from project', { userId, projectId, appId });

            return true;
        } catch (error) {
            this.handleDatabaseError(error, 'removeAppFromProject', { userId, projectId, appId });
        }
    }

    /**
     * Get apps in a project
     */
    async getProjectApps(userId: string, projectId: string): Promise<schema.App[]> {
        try {
            // Verify project ownership
            const [project] = await this.database
                .select()
                .from(schema.projects)
                .where(
                    and(
                        eq(schema.projects.id, projectId),
                        eq(schema.projects.userId, userId)
                    )
                )
                .limit(1);

            if (!project) {
                return [];
            }

            // Get apps
            const projectApps = await this.database
                .select({ app: schema.apps })
                .from(schema.projectApps)
                .innerJoin(schema.apps, eq(schema.projectApps.appId, schema.apps.id))
                .where(eq(schema.projectApps.projectId, projectId));

            return projectApps.map((pa) => pa.app);
        } catch (error) {
            this.handleDatabaseError(error, 'getProjectApps', { userId, projectId });
        }
    }
}
