import { useRef, type ChangeEvent } from 'react';
import { FileText } from 'lucide-react';

// Accepted file extensions for documents
const ACCEPTED_EXTENSIONS = [
	'.txt', '.md', '.markdown', '.csv', '.json', '.pdf',
	'.html', '.htm', '.css', '.js', '.mjs', '.ts', '.tsx', '.jsx',
	'.py', '.java', '.go', '.rs', '.c', '.h', '.cpp', '.hpp',
	'.yaml', '.yml', '.xml', '.env', '.sh', '.bash', '.zsh',
	'.sql', '.graphql', '.prisma', '.toml', '.ini', '.cfg'
].join(',');

export interface DocumentUploadButtonProps {
	onFilesSelected: (files: File[]) => void;
	disabled?: boolean;
	multiple?: boolean;
	className?: string;
	iconClassName?: string;
}

/**
 * Button component for uploading documents
 */
export function DocumentUploadButton({
	onFilesSelected,
	disabled = false,
	multiple = true,
	className = '',
	iconClassName = 'size-4',
}: DocumentUploadButtonProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		if (files.length > 0) {
			onFilesSelected(files);
		}
		// Reset input so the same file can be selected again
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_EXTENSIONS}
				multiple={multiple}
				onChange={handleFileChange}
				className="hidden"
				disabled={disabled}
			/>
			<button
				type="button"
				onClick={handleClick}
				disabled={disabled}
				className={`p-1 rounded-md bg-transparent hover:bg-bg-3 text-text-secondary hover:text-text-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
				aria-label="Upload document"
				title="Upload document (TXT, MD, JSON, PDF, code files...)"
			>
				<FileText className={iconClassName} strokeWidth={1.5} />
			</button>
		</>
	);
}
