/**
 * Vitest Test Setup
 * Configures global test environment for Cloudflare Workers tests
 */

// Set test environment flag
process.env.NODE_ENV = 'test';

// Global test utilities
beforeEach(() => {
    // Reset any global state before each test
});

afterEach(() => {
    // Clean up after each test
});

// Mock console.error to prevent noise in tests (optional)
// vi.spyOn(console, 'error').mockImplementation(() => {});
