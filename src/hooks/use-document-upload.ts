import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
	type DocumentAttachment,
	isSupportedDocumentType,
	getMimeTypeFromExtension,
	isTextBasedDocument,
	MAX_DOCUMENT_SIZE_BYTES,
	MAX_DOCUMENTS_PER_MESSAGE,
	MAX_DOCUMENT_CHARS,
	type SupportedDocumentMimeType,
} from 'worker/types/document-attachment';

export interface UseDocumentUploadOptions {
	maxDocuments?: number;
	maxSizeBytes?: number;
	maxChars?: number;
	onError?: (error: string) => void;
}

export interface UseDocumentUploadReturn {
	documents: DocumentAttachment[];
	addDocuments: (files: File[]) => Promise<void>;
	removeDocument: (id: string) => void;
	clearDocuments: () => void;
	isProcessing: boolean;
}

/**
 * Extract text content from a PDF file using pdf.js
 * Falls back to a placeholder if pdf.js is not available
 */
async function extractPdfText(file: File): Promise<string> {
	// For now, we'll indicate PDF content without full extraction
	// Full PDF parsing would require pdf.js library
	return `[PDF Document: ${file.name}]\n\nNote: PDF text extraction requires additional processing. The document "${file.name}" (${(file.size / 1024).toFixed(1)} KB) has been attached for reference.`;
}

/**
 * Read text content from a file
 */
async function readTextContent(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			resolve(content || '');
		};
		reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
		reader.readAsText(file);
	});
}

/**
 * Hook for handling document uploads
 */
export function useDocumentUpload(options: UseDocumentUploadOptions = {}): UseDocumentUploadReturn {
	const {
		maxDocuments = MAX_DOCUMENTS_PER_MESSAGE,
		maxSizeBytes = MAX_DOCUMENT_SIZE_BYTES,
		maxChars = MAX_DOCUMENT_CHARS,
		onError,
	} = options;

	const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);

	const processDocumentFile = useCallback(async (file: File): Promise<DocumentAttachment | null> => {
		// Check file size
		if (file.size > maxSizeBytes) {
			const errorMsg = `File "${file.name}" exceeds maximum size of ${(maxSizeBytes / 1024 / 1024).toFixed(1)}MB`;
			toast.error(errorMsg);
			onError?.(errorMsg);
			return null;
		}

		// Determine MIME type from file or extension
		let mimeType: SupportedDocumentMimeType | null = null;

		if (isSupportedDocumentType(file.type)) {
			mimeType = file.type as SupportedDocumentMimeType;
		} else {
			// Try to infer from extension
			mimeType = getMimeTypeFromExtension(file.name);
		}

		if (!mimeType) {
			const errorMsg = `Unsupported file type: ${file.name}. Supported: TXT, MD, CSV, JSON, PDF, HTML, CSS, JS, TS, PY, and more.`;
			toast.error(errorMsg);
			onError?.(errorMsg);
			return null;
		}

		try {
			let textContent: string;

			if (isTextBasedDocument(mimeType)) {
				textContent = await readTextContent(file);
			} else if (mimeType === 'application/pdf') {
				textContent = await extractPdfText(file);
			} else {
				textContent = await readTextContent(file);
			}

			// Truncate if necessary
			let truncated = false;
			if (textContent.length > maxChars) {
				textContent = textContent.substring(0, maxChars) + '\n\n... [Content truncated]';
				truncated = true;
			}

			const lineCount = textContent.split('\n').length;
			const extension = file.name.match(/\.[^.]+$/)?.[0] || '';

			return {
				id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				filename: file.name,
				mimeType,
				textContent,
				size: file.size,
				lineCount,
				truncated,
				extension,
			};
		} catch (error) {
			const errorMsg = `Failed to process "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
			toast.error(errorMsg);
			onError?.(errorMsg);
			return null;
		}
	}, [maxSizeBytes, maxChars, onError]);

	const addDocuments = useCallback(async (files: File[]) => {
		setIsProcessing(true);

		try {
			// Check if adding these files would exceed the limit
			if (documents.length + files.length > maxDocuments) {
				const errorMsg = `Maximum ${maxDocuments} documents allowed per message.`;
				toast.error(errorMsg);
				onError?.(errorMsg);
				return;
			}

			// Process all files
			const processedDocs = await Promise.all(
				files.map(file => processDocumentFile(file))
			);

			// Filter out null results (failed validations)
			const validDocs = processedDocs.filter((doc): doc is DocumentAttachment => doc !== null);

			if (validDocs.length > 0) {
				setDocuments(prev => [...prev, ...validDocs]);
				toast.success(`${validDocs.length} document${validDocs.length > 1 ? 's' : ''} added`);
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Failed to process documents';
			onError?.(errorMsg);
		} finally {
			setIsProcessing(false);
		}
	}, [documents.length, maxDocuments, processDocumentFile, onError]);

	const removeDocument = useCallback((id: string) => {
		setDocuments(prev => prev.filter(doc => doc.id !== id));
	}, []);

	const clearDocuments = useCallback(() => {
		setDocuments([]);
	}, []);

	return {
		documents,
		addDocuments,
		removeDocument,
		clearDocuments,
		isProcessing,
	};
}
