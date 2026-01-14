import { useCallback, useEffect, useRef, useState } from 'react';
import * as esbuild from 'esbuild-wasm';

interface TranspileResult {
	code: string;
	error?: string;
}

interface TranspilerState {
	isInitialized: boolean;
	isInitializing: boolean;
	error: string | null;
}

// CDN imports for React and common packages
const CDN_IMPORTS: Record<string, string> = {
	'react': 'https://esm.sh/react@18.2.0',
	'react-dom': 'https://esm.sh/react-dom@18.2.0',
	'react-dom/client': 'https://esm.sh/react-dom@18.2.0/client',
	'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
	'lucide-react': 'https://esm.sh/lucide-react@0.400.0',
	'framer-motion': 'https://esm.sh/framer-motion@11.0.0',
	'clsx': 'https://esm.sh/clsx@2.1.0',
	'tailwind-merge': 'https://esm.sh/tailwind-merge@2.2.0',
	'date-fns': 'https://esm.sh/date-fns@3.0.0',
	'zod': 'https://esm.sh/zod@3.22.0',
	'sonner': 'https://esm.sh/sonner@1.4.0',
};

/**
 * Hook for transpiling TypeScript/JSX code using esbuild-wasm
 */
export function useEsbuildTranspiler() {
	const [state, setState] = useState<TranspilerState>({
		isInitialized: false,
		isInitializing: false,
		error: null,
	});

	const initPromiseRef = useRef<Promise<void> | null>(null);

	// Initialize esbuild-wasm
	const initialize = useCallback(async () => {
		if (state.isInitialized || state.isInitializing) return;

		setState(prev => ({ ...prev, isInitializing: true, error: null }));

		try {
			// Check if already initialized
			if (initPromiseRef.current) {
				await initPromiseRef.current;
				return;
			}

			initPromiseRef.current = esbuild.initialize({
				wasmURL: 'https://unpkg.com/esbuild-wasm@0.27.2/esbuild.wasm',
			});

			await initPromiseRef.current;

			setState({
				isInitialized: true,
				isInitializing: false,
				error: null,
			});
		} catch (err) {
			// If already initialized, that's fine
			if (err instanceof Error && err.message.includes('already')) {
				setState({
					isInitialized: true,
					isInitializing: false,
					error: null,
				});
				return;
			}

			setState({
				isInitialized: false,
				isInitializing: false,
				error: err instanceof Error ? err.message : 'Failed to initialize esbuild',
			});
		}
	}, [state.isInitialized, state.isInitializing]);

	// Auto-initialize on mount
	useEffect(() => {
		initialize();
	}, [initialize]);

	/**
	 * Transpile a single file from TypeScript/JSX to JavaScript
	 */
	const transpileFile = useCallback(async (
		filePath: string,
		code: string
	): Promise<TranspileResult> => {
		if (!state.isInitialized) {
			return { code: '', error: 'Transpiler not initialized' };
		}

		try {
			// Determine loader based on file extension
			const ext = filePath.split('.').pop()?.toLowerCase() || 'tsx';
			const loader = (['ts', 'tsx', 'jsx', 'js'].includes(ext)
				? ext
				: 'tsx') as 'ts' | 'tsx' | 'jsx' | 'js';

			const result = await esbuild.transform(code, {
				loader,
				jsx: 'automatic',
				jsxImportSource: 'react',
				format: 'esm',
				target: 'es2020',
				minify: false,
				sourcemap: false,
			});

			// Replace bare imports with CDN URLs
			let transformedCode = result.code;
			for (const [pkg, url] of Object.entries(CDN_IMPORTS)) {
				// Match various import patterns
				const patterns = [
					new RegExp(`from ["']${pkg}["']`, 'g'),
					new RegExp(`import ["']${pkg}["']`, 'g'),
				];
				for (const pattern of patterns) {
					transformedCode = transformedCode.replace(pattern, (match) =>
						match.replace(pkg, url)
					);
				}
			}

			return { code: transformedCode };
		} catch (err) {
			return {
				code: '',
				error: err instanceof Error ? err.message : 'Transpilation failed',
			};
		}
	}, [state.isInitialized]);

	/**
	 * Bundle multiple files into a single executable bundle
	 */
	const bundleFiles = useCallback(async (
		files: Array<{ path: string; contents: string }>
	): Promise<TranspileResult> => {
		if (!state.isInitialized) {
			return { code: '', error: 'Transpiler not initialized' };
		}

		if (files.length === 0) {
			return { code: '', error: 'No files to bundle' };
		}

		try {
			// Find entry point (App.tsx is most common for generated apps)
			const entryPoints = ['src/App.tsx', 'App.tsx', 'src/app.tsx', 'app.tsx', 'src/main.tsx', 'main.tsx', 'src/index.tsx', 'index.tsx'];
			let entryFile = files.find(f =>
				entryPoints.some(ep => f.path.endsWith(ep) || f.path === ep)
			);

			if (!entryFile) {
				// Try to find any .tsx file as entry
				entryFile = files.find(f => f.path.endsWith('.tsx'));
				if (!entryFile) {
					return { code: '', error: 'No entry point found' };
				}
			}

			// Create a map of file paths for import resolution
			const fileMap = new Map<string, string>();
			for (const file of files) {
				fileMap.set(file.path, file.contents);
				// Also add normalized paths
				fileMap.set(normalizePath(file.path), file.contents);
			}

			// Transpile all files and collect exports
			const transpiledModules: Array<{ path: string; code: string; exports: string[] }> = [];

			for (const file of files) {
				const result = await transpileFile(file.path, file.contents);
				if (result.error) {
					console.warn(`Error transpiling ${file.path}:`, result.error);
					continue;
				}

				// Extract exports from the original source
				const exports = extractExports(file.contents);
				transpiledModules.push({
					path: file.path,
					code: result.code,
					exports
				});
			}

			// Generate bundle with proper module resolution
			const bundleCode = generateESMBundle(transpiledModules, entryFile.path);

			return { code: bundleCode };
		} catch (err) {
			return {
				code: '',
				error: err instanceof Error ? err.message : 'Bundle failed',
			};
		}
	}, [state.isInitialized, transpileFile]);

	return {
		...state,
		transpileFile,
		bundleFiles,
		initialize,
	};
}

/**
 * Normalize file path for matching
 */
function normalizePath(path: string): string {
	return path
		.replace(/^\.\//, '')
		.replace(/\.(tsx?|jsx?)$/, '');
}

/**
 * Extract export names from source code
 */
function extractExports(source: string): string[] {
	const exports: string[] = [];

	// Match "export default"
	if (/export\s+default/.test(source)) {
		exports.push('default');
	}

	// Match "export function Name" or "export const Name"
	const namedExports = source.matchAll(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
	for (const match of namedExports) {
		exports.push(match[1]);
	}

	// Match "export { Name, ... }"
	const bracketExports = source.matchAll(/export\s*\{([^}]+)\}/g);
	for (const match of bracketExports) {
		const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
		exports.push(...names.filter(Boolean));
	}

	return exports;
}

/**
 * Generate ESM-compatible bundle
 */
function generateESMBundle(
	modules: Array<{ path: string; code: string; exports: string[] }>,
	entryPath: string
): string {
	const moduleRegistry: string[] = [];
	const pathToName = new Map<string, string>();

	// Create module name mapping
	modules.forEach((mod, index) => {
		const name = `__mod${index}__`;
		pathToName.set(mod.path, name);
		pathToName.set(normalizePath(mod.path), name);

		// Also map common variations
		const baseName = mod.path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '');
		if (baseName) {
			pathToName.set(baseName, name);
			pathToName.set(`./${baseName}`, name);
		}
	});

	// Process each module
	for (const mod of modules) {
		const modName = pathToName.get(mod.path) || '__unknown__';

		// Transform the code to work with our module registry
		let code = mod.code;

		// Replace relative imports with module references
		// Match: from './something' or from "../something"
		code = code.replace(
			/from\s+["'](\.[^"']+)["']/g,
			(match, importPath) => {
				const normalizedImport = normalizePath(importPath);
				const targetName = pathToName.get(normalizedImport);
				if (targetName) {
					return `from "${targetName}"`;
				}
				// Keep original if not found (might be external)
				return match;
			}
		);

		// Wrap module in a namespace to avoid conflicts
		moduleRegistry.push(`
// === Module: ${mod.path} ===
const ${modName} = (() => {
	const __exports = {};

	// Module code (transformed)
	${code.replace(/export\s+default\s+/g, '__exports.default = ')
		.replace(/export\s+(const|let|var|function|class)\s+(\w+)/g, '$1 $2; __exports.$2 = $2')
		.replace(/export\s*\{([^}]+)\}/g, (_, names) => {
			return names.split(',').map((n: string) => {
				const [name, alias] = n.trim().split(/\s+as\s+/);
				return `__exports.${alias || name} = ${name};`;
			}).join('\n');
		})}

	return __exports;
})();
`);
	}

	// Find the entry module
	const entryModName = pathToName.get(entryPath) || pathToName.get(normalizePath(entryPath));

	return `
// ========================================
// Vibe SDK Live Preview Bundle
// Generated at: ${new Date().toISOString()}
// ========================================

${moduleRegistry.join('\n')}

// === Entry Point Export ===
const App = ${entryModName}?.default || ${entryModName}?.App || (() => {
	const React = window.React;
	return React.createElement('div', { className: 'p-4 text-red-500' }, 'No App component found');
});
`;
}
