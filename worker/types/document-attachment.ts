/**
 * Supported document MIME types for upload
 * Includes text-based documents that can be parsed and used as context
 */
export const SUPPORTED_DOCUMENT_MIME_TYPES = [
	'text/plain',
	'text/markdown',
	'text/csv',
	'application/json',
	'application/pdf',
	'text/html',
	'text/css',
	'text/javascript',
	'application/typescript',
	'text/x-python',
	'text/x-java',
	'text/x-go',
	'text/x-rust',
	'text/x-c',
	'text/x-cpp',
	'text/yaml',
	'application/xml',
] as const;

export type SupportedDocumentMimeType = typeof SUPPORTED_DOCUMENT_MIME_TYPES[number];

/**
 * File extensions mapped to MIME types
 */
export const DOCUMENT_EXTENSION_MAP: Record<string, SupportedDocumentMimeType> = {
	'.txt': 'text/plain',
	'.md': 'text/markdown',
	'.markdown': 'text/markdown',
	'.csv': 'text/csv',
	'.json': 'application/json',
	'.pdf': 'application/pdf',
	'.html': 'text/html',
	'.htm': 'text/html',
	'.css': 'text/css',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.ts': 'application/typescript',
	'.tsx': 'application/typescript',
	'.jsx': 'text/javascript',
	'.py': 'text/x-python',
	'.java': 'text/x-java',
	'.go': 'text/x-go',
	'.rs': 'text/x-rust',
	'.c': 'text/x-c',
	'.h': 'text/x-c',
	'.cpp': 'text/x-cpp',
	'.hpp': 'text/x-cpp',
	'.yaml': 'text/yaml',
	'.yml': 'text/yaml',
	'.xml': 'application/xml',
};

/**
 * Document attachment for user messages
 * Represents a document that can be sent with text prompts
 */
export interface DocumentAttachment {
	/** Unique identifier for this attachment */
	id: string;
	/** Original filename */
	filename: string;
	/** MIME type of the document */
	mimeType: SupportedDocumentMimeType;
	/** Text content of the document (extracted) */
	textContent: string;
	/** Size of the original file in bytes */
	size: number;
	/** Number of lines in the document */
	lineCount?: number;
	/** Whether the document was truncated due to size */
	truncated?: boolean;
	/** File extension */
	extension: string;
}

export interface ProcessedDocumentAttachment {
	/** MIME type of the document */
	mimeType: SupportedDocumentMimeType;
	/** Text content of the document */
	textContent: string;
	/** R2 key of the document (if stored) */
	r2Key?: string;
	/** Document content hash */
	hash: string;
}

/**
 * Utility to check if a MIME type is supported for documents
 */
export function isSupportedDocumentType(mimeType: string): mimeType is SupportedDocumentMimeType {
	return SUPPORTED_DOCUMENT_MIME_TYPES.includes(mimeType as SupportedDocumentMimeType);
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): SupportedDocumentMimeType | null {
	const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
	if (!ext) return null;
	return DOCUMENT_EXTENSION_MAP[ext] || null;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: SupportedDocumentMimeType): string {
	const entry = Object.entries(DOCUMENT_EXTENSION_MAP).find(([_, mime]) => mime === mimeType);
	return entry?.[0] || '.txt';
}

/**
 * Check if a document type is text-based (can be read directly)
 */
export function isTextBasedDocument(mimeType: SupportedDocumentMimeType): boolean {
	return mimeType !== 'application/pdf';
}

/**
 * Maximum file size for documents (5MB)
 */
export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Maximum number of documents per message
 */
export const MAX_DOCUMENTS_PER_MESSAGE = 3;

/**
 * Maximum characters to extract from a document
 */
export const MAX_DOCUMENT_CHARS = 100000;
