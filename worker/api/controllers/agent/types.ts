import { PreviewType } from "../../../services/sandbox/sandboxTypes";
import type { ImageAttachment } from '../../../types/image-attachment';
import type { DocumentAttachment } from '../../../types/document-attachment';

export interface CodeGenArgs {
    query: string;
    language?: string;
    frameworks?: string[];
    selectedTemplate?: string;
    agentMode: 'deterministic' | 'smart';
    images?: ImageAttachment[];
    documents?: DocumentAttachment[];
}

/**
 * Data structure for connectToExistingAgent response
 */
export interface AgentConnectionData {
    websocketUrl: string;
    agentId: string;
}

export interface AgentPreviewResponse extends PreviewType {
}
    