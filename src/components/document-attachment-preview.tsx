import { X, FileText, FileCode, FileJson, FileType2, File } from 'lucide-react';
import type { DocumentAttachment } from 'worker/types/document-attachment';
import { motion, AnimatePresence } from 'framer-motion';

export interface DocumentAttachmentPreviewProps {
	documents: DocumentAttachment[];
	onRemove?: (id: string) => void;
	className?: string;
	compact?: boolean;
}

/**
 * Get appropriate icon for document type
 */
function getDocumentIcon(mimeType: string, extension: string) {
	// Code files
	if (
		mimeType.includes('javascript') ||
		mimeType.includes('typescript') ||
		mimeType.includes('python') ||
		mimeType.includes('java') ||
		mimeType.includes('go') ||
		mimeType.includes('rust') ||
		mimeType.includes('c') ||
		mimeType.includes('cpp') ||
		['.js', '.ts', '.tsx', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h'].includes(extension)
	) {
		return FileCode;
	}

	// JSON files
	if (mimeType === 'application/json' || extension === '.json') {
		return FileJson;
	}

	// Markdown
	if (mimeType === 'text/markdown' || ['.md', '.markdown'].includes(extension)) {
		return FileType2;
	}

	// Default text/document icon
	return FileText;
}

/**
 * Get color class for document type
 */
function getDocumentColor(mimeType: string, extension: string): string {
	if (mimeType.includes('javascript') || ['.js', '.jsx', '.mjs'].includes(extension)) {
		return 'text-yellow-500';
	}
	if (mimeType.includes('typescript') || ['.ts', '.tsx'].includes(extension)) {
		return 'text-blue-500';
	}
	if (mimeType.includes('python') || extension === '.py') {
		return 'text-green-500';
	}
	if (mimeType === 'application/json' || extension === '.json') {
		return 'text-amber-500';
	}
	if (mimeType === 'text/markdown' || ['.md', '.markdown'].includes(extension)) {
		return 'text-purple-500';
	}
	if (mimeType === 'application/pdf' || extension === '.pdf') {
		return 'text-red-500';
	}
	if (mimeType.includes('html') || ['.html', '.htm'].includes(extension)) {
		return 'text-orange-500';
	}
	if (mimeType.includes('css') || extension === '.css') {
		return 'text-cyan-500';
	}
	return 'text-gray-500';
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Component to display document attachment previews
 */
export function DocumentAttachmentPreview({
	documents,
	onRemove,
	className = '',
	compact = false,
}: DocumentAttachmentPreviewProps) {
	if (documents.length === 0) return null;

	return (
		<div className={`flex flex-wrap gap-2 ${className}`}>
			<AnimatePresence mode="popLayout">
				{documents.map((doc) => {
					const Icon = getDocumentIcon(doc.mimeType, doc.extension);
					const colorClass = getDocumentColor(doc.mimeType, doc.extension);

					return (
						<motion.div
							key={doc.id}
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ duration: 0.2 }}
							className={`relative group flex items-center gap-2 ${
								compact ? 'px-2 py-1' : 'px-3 py-2'
							} rounded-lg border border-border-primary bg-bg-3 hover:bg-bg-2 transition-colors`}
						>
							<Icon className={`${compact ? 'size-4' : 'size-5'} ${colorClass} flex-shrink-0`} />

							<div className="flex flex-col min-w-0">
								<span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-text-primary truncate max-w-[150px]`}>
									{doc.filename}
								</span>
								{!compact && (
									<span className="text-xs text-text-tertiary">
										{formatFileSize(doc.size)}
										{doc.lineCount && ` \u00B7 ${doc.lineCount} lines`}
										{doc.truncated && ' \u00B7 truncated'}
									</span>
								)}
							</div>

							{onRemove && (
								<button
									type="button"
									onClick={() => onRemove(doc.id)}
									className={`${
										compact ? 'ml-1' : 'ml-2'
									} p-0.5 rounded-full bg-bg-1/90 hover:bg-destructive/20 text-text-secondary hover:text-destructive opacity-0 group-hover:opacity-100 transition-all`}
									aria-label={`Remove ${doc.filename}`}
								>
									<X className={compact ? 'size-3' : 'size-4'} />
								</button>
							)}
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
