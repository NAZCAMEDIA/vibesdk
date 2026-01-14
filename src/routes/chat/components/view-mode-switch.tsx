import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Code, Zap } from 'lucide-react';

export function ViewModeSwitch({
	view,
	onChange,
	previewAvailable = false,
	livePreviewAvailable = false,
	showTooltip = false,
}: {
	view: 'preview' | 'editor' | 'blueprint' | 'live'
	onChange: (mode: 'preview' | 'editor' | 'blueprint' | 'live') => void;
	previewAvailable: boolean;
	livePreviewAvailable?: boolean;
	showTooltip: boolean;
}) {
	// Show at least live preview if available, even if deployed preview isn't ready
	if (!previewAvailable && !livePreviewAvailable) {
		return null;
	}

	return (
		<div className="flex items-center gap-1 bg-bg-1 rounded-md p-0.5 relative">
			<AnimatePresence>
				{showTooltip && (
					<motion.div
						initial={{ opacity: 0, scale: 0.4 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0 }}
						className="absolute z-50 top-10 left-0 bg-bg-2 text-text-primary text-xs px-2 py-1 rounded whitespace-nowrap animate-fade-in"
					>
						You can view code anytime from here
					</motion.div>
				)}
			</AnimatePresence>

			{/* Live Preview - Real-time rendering */}
			{livePreviewAvailable && (
				<button
					onClick={() => onChange('live')}
					className={clsx(
						'p-1 flex items-center justify-between h-full rounded-md transition-colors',
						view === 'live'
							? 'bg-accent text-white'
							: 'text-text-50/70 hover:text-text-primary hover:bg-accent/50',
					)}
					title="Live Preview (real-time)"
				>
					<Zap className="size-4" />
				</button>
			)}

			{/* Deployed Preview */}
			{previewAvailable && (
				<button
					onClick={() => onChange('preview')}
					className={clsx(
						'p-1 flex items-center justify-between h-full rounded-md transition-colors',
						view === 'preview'
							? 'bg-bg-4 text-text-primary'
							: 'text-text-50/70 hover:text-text-primary hover:bg-accent',
					)}
					title="Deployed Preview"
				>
					<Eye className="size-4" />
				</button>
			)}
			<button
				onClick={() => onChange('editor')}
				className={clsx(
					'p-1 flex items-center justify-between h-full rounded-md transition-colors',
					view === 'editor'
						? 'bg-bg-4 text-text-primary'
						: 'text-text-50/70 hover:text-text-primary hover:bg-accent',
				)}
				title="Code Editor"
			>
				<Code className="size-4" />
			</button>
			{/* {terminalAvailable && (
				<button
					onClick={() => onChange('terminal')}
					className={clsx(
						'p-1 flex items-center justify-between h-full rounded-md transition-colors',
						view === 'terminal'
							? 'bg-bg-4 text-text-primary'
							: 'text-text-50/70 hover:text-text-primary hover:bg-accent',
					)}
					title="Terminal"
				>
					<Terminal className="size-4" />
				</button>
			)} */}
		</div>
	);
}
