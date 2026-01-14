import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { RefreshCw, AlertCircle, Play, Pause, Zap } from 'lucide-react';
import { useEsbuildTranspiler } from '../hooks/use-esbuild-transpiler';
import type { FileType } from '../hooks/use-chat';

interface LivePreviewSandboxProps {
	files: FileType[];
	className?: string;
	isGenerating?: boolean;
}

interface PreviewState {
	status: 'initializing' | 'ready' | 'compiling' | 'running' | 'error';
	error: string | null;
	lastUpdate: number;
}

// HTML template for the sandbox iframe
const createSandboxHTML = (bundledCode: string, tailwindEnabled: boolean = true) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Live Preview</title>
	${tailwindEnabled ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: #0a0a0a;
			color: #fafafa;
			min-height: 100vh;
		}
		#root { min-height: 100vh; }
		.preview-error {
			padding: 20px;
			background: #450a0a;
			border: 1px solid #dc2626;
			border-radius: 8px;
			margin: 20px;
			color: #fecaca;
		}
		.preview-error h3 { color: #f87171; margin-bottom: 8px; }
		.preview-error pre {
			font-family: monospace;
			font-size: 12px;
			overflow-x: auto;
			white-space: pre-wrap;
		}
	</style>
</head>
<body>
	<div id="root"></div>
	<script type="module">
		// Error boundary for runtime errors
		window.onerror = function(message, source, lineno, colno, error) {
			const root = document.getElementById('root');
			root.innerHTML = \`
				<div class="preview-error">
					<h3>Runtime Error</h3>
					<pre>\${message}\\n\\nAt line \${lineno}, column \${colno}</pre>
				</div>
			\`;
			return true;
		};

		window.onunhandledrejection = function(event) {
			const root = document.getElementById('root');
			root.innerHTML = \`
				<div class="preview-error">
					<h3>Unhandled Promise Rejection</h3>
					<pre>\${event.reason}</pre>
				</div>
			\`;
		};

		try {
			${bundledCode}
		} catch (error) {
			const root = document.getElementById('root');
			root.innerHTML = \`
				<div class="preview-error">
					<h3>Execution Error</h3>
					<pre>\${error.message}\\n\\n\${error.stack || ''}</pre>
				</div>
			\`;
		}
	</script>
</body>
</html>
`;

export function LivePreviewSandbox({
	files,
	className = '',
	isGenerating = false,
}: LivePreviewSandboxProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);

	const [state, setState] = useState<PreviewState>({
		status: 'initializing',
		error: null,
		lastUpdate: 0,
	});

	const [isPaused, setIsPaused] = useState(false);
	const [sandboxHTML, setSandboxHTML] = useState<string>('');

	const {
		isInitialized,
		isInitializing,
		error: transpilerError,
		bundleFiles,
	} = useEsbuildTranspiler();

	// Filter to only include .tsx, .ts, .jsx, .js files
	const codeFiles = useMemo(() => {
		return files.filter(f => {
			const ext = f.filePath.split('.').pop()?.toLowerCase();
			return ['tsx', 'ts', 'jsx', 'js', 'css'].includes(ext || '');
		});
	}, [files]);

	// Convert files to bundler format
	const bundlerFiles = useMemo(() => {
		return codeFiles.map(f => ({
			path: f.filePath,
			contents: f.fileContents,
		}));
	}, [codeFiles]);

	/**
	 * Compile and render the preview
	 */
	const compileAndRender = useCallback(async () => {
		if (!isInitialized || bundlerFiles.length === 0) {
			return;
		}

		// Don't compile while files are still being generated (debounce)
		if (isGenerating && !isPaused) {
			setState(prev => ({ ...prev, status: 'compiling' }));
		}

		try {
			// Bundle all files together
			const result = await bundleFiles(bundlerFiles);

			if (result.error) {
				setState({
					status: 'error',
					error: result.error,
					lastUpdate: Date.now(),
				});
				return;
			}

			// Create the wrapper that renders the App
			const wrapperCode = `
// Import React from CDN
import React from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';

// Bundled Application Code
${result.code}

// Mount the app
const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	// Try to find the default export or App component
	const AppComponent = typeof App !== 'undefined' ? App :
		(typeof exports !== 'undefined' && exports.default) ? exports.default :
		() => React.createElement('div', null, 'No App component found');
	root.render(React.createElement(AppComponent));
}
`;

			const html = createSandboxHTML(wrapperCode);
			setSandboxHTML(html);

			setState({
				status: 'running',
				error: null,
				lastUpdate: Date.now(),
			});
		} catch (error) {
			setState({
				status: 'error',
				error: error instanceof Error ? error.message : 'Compilation failed',
				lastUpdate: Date.now(),
			});
		}
	}, [isInitialized, bundlerFiles, bundleFiles, isGenerating, isPaused]);

	/**
	 * Effect: Update preview when files change (debounced)
	 */
	useEffect(() => {
		if (!isInitialized || isPaused) return;

		// Clear existing debounce
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// Debounce compilation during active generation
		const delay = isGenerating ? 1000 : 300;

		debounceRef.current = setTimeout(() => {
			compileAndRender();
		}, delay);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [isInitialized, bundlerFiles, isPaused, isGenerating, compileAndRender]);

	/**
	 * Effect: Update transpiler status
	 */
	useEffect(() => {
		if (transpilerError) {
			setState({
				status: 'error',
				error: transpilerError,
				lastUpdate: Date.now(),
			});
		} else if (isInitializing) {
			setState(prev => ({ ...prev, status: 'initializing' }));
		} else if (isInitialized && state.status === 'initializing') {
			setState(prev => ({ ...prev, status: 'ready' }));
		}
	}, [isInitialized, isInitializing, transpilerError, state.status]);

	/**
	 * Manual refresh handler
	 */
	const handleRefresh = useCallback(() => {
		compileAndRender();
	}, [compileAndRender]);

	/**
	 * Toggle pause state
	 */
	const handleTogglePause = useCallback(() => {
		setIsPaused(prev => !prev);
	}, []);

	// ============================================================================
	// Render
	// ============================================================================

	// Initializing transpiler
	if (state.status === 'initializing' || isInitializing) {
		return (
			<div className={`${className} flex flex-col items-center justify-center bg-bg-3 border border-text/10 rounded-lg`}>
				<div className="text-center p-8 max-w-md">
					<Zap className="size-8 text-accent animate-pulse mx-auto mb-4" />
					<h3 className="text-lg font-medium text-text-primary mb-2">
						Initializing Live Preview
					</h3>
					<p className="text-text-primary/70 text-sm">
						Loading esbuild-wasm transpiler...
					</p>
				</div>
			</div>
		);
	}

	// No files yet
	if (codeFiles.length === 0) {
		return (
			<div className={`${className} flex flex-col items-center justify-center bg-bg-3 border border-text/10 rounded-lg`}>
				<div className="text-center p-8 max-w-md">
					<Play className="size-8 text-text-primary/50 mx-auto mb-4" />
					<h3 className="text-lg font-medium text-text-primary mb-2">
						Waiting for Code
					</h3>
					<p className="text-text-primary/70 text-sm">
						The live preview will appear here as code is generated.
					</p>
				</div>
			</div>
		);
	}

	// Error state
	if (state.status === 'error' && state.error) {
		return (
			<div className={`${className} flex flex-col bg-bg-3 border border-text/10 rounded-lg overflow-hidden`}>
				{/* Header with controls */}
				<div className="flex items-center justify-between px-3 py-2 bg-bg-2 border-b border-text/10">
					<div className="flex items-center gap-2">
						<AlertCircle className="size-4 text-red-500" />
						<span className="text-xs text-red-400">Compilation Error</span>
					</div>
					<button
						onClick={handleRefresh}
						className="p-1.5 rounded hover:bg-accent/20 transition-colors"
						title="Retry compilation"
					>
						<RefreshCw className="size-4 text-text-primary/70" />
					</button>
				</div>
				{/* Error content */}
				<div className="flex-1 overflow-auto p-4">
					<div className="bg-red-950/50 border border-red-500/30 rounded-lg p-4">
						<pre className="text-xs text-red-300 font-mono whitespace-pre-wrap">
							{state.error}
						</pre>
					</div>
				</div>
			</div>
		);
	}

	// Success: render iframe
	return (
		<div className={`${className} flex flex-col bg-bg-3 border border-text/10 rounded-lg overflow-hidden`}>
			{/* Header with controls */}
			<div className="flex items-center justify-between px-3 py-2 bg-bg-2 border-b border-text/10">
				<div className="flex items-center gap-2">
					{state.status === 'compiling' ? (
						<>
							<RefreshCw className="size-4 text-accent animate-spin" />
							<span className="text-xs text-text-primary/70">Compiling...</span>
						</>
					) : (
						<>
							<div className="size-2 rounded-full bg-green-500" />
							<span className="text-xs text-text-primary/70">
								Live Preview
								{isGenerating && !isPaused && (
									<span className="ml-1 text-accent">(auto-updating)</span>
								)}
							</span>
						</>
					)}
				</div>
				<div className="flex items-center gap-1">
					{isGenerating && (
						<button
							onClick={handleTogglePause}
							className="p-1.5 rounded hover:bg-accent/20 transition-colors"
							title={isPaused ? 'Resume auto-update' : 'Pause auto-update'}
						>
							{isPaused ? (
								<Play className="size-4 text-text-primary/70" />
							) : (
								<Pause className="size-4 text-text-primary/70" />
							)}
						</button>
					)}
					<button
						onClick={handleRefresh}
						className="p-1.5 rounded hover:bg-accent/20 transition-colors"
						title="Refresh preview"
					>
						<RefreshCw className="size-4 text-text-primary/70" />
					</button>
				</div>
			</div>

			{/* Iframe */}
			<iframe
				ref={iframeRef}
				srcDoc={sandboxHTML}
				className="flex-1 w-full bg-white"
				title="Live Preview"
				sandbox="allow-scripts allow-modals"
			/>
		</div>
	);
}

LivePreviewSandbox.displayName = 'LivePreviewSandbox';
