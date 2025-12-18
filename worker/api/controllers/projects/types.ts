/**
 * Type definitions for Projects Controller responses
 */

import type { Project, App } from '../../../database/schema';
import type { ProjectWithAppCount } from '../../../database/services/ProjectsService';

/**
 * Response data for getProjects
 */
export interface ProjectsListData {
    projects: ProjectWithAppCount[];
}

/**
 * Response data for single project operations
 */
export interface ProjectData {
    project: ProjectWithAppCount | Project;
    message?: string;
}

/**
 * Response data for project apps
 */
export interface ProjectAppsData {
    apps: App[];
}

/**
 * Simple message response
 */
export interface ProjectMessageData {
    message: string;
}
