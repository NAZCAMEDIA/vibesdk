# MCP Integration Testing Guide

## Overview

This document covers testing procedures for the MCP (Model Context Protocol) integration in the Vibe Platform.

## Test Infrastructure Status

**Known Issue:** Vitest dependency mismatch
- `vitest: ^3.2.4`
- `@vitest/coverage-v8: ^4.0.15` (incompatible major version)

To fix, run:
```bash
pnpm add -D @vitest/coverage-v8@3
```

## Test Files

| File | Description |
|------|-------------|
| `worker/agents/tools/mcp-manager.test.ts` | Unit tests for MCPManager class |
| `test/setup.ts` | Global test configuration |
| `wrangler.test.jsonc` | Test environment Wrangler config |

---

## Manual Test Scenarios

### Scenario 1: Add New MCP Server

**Steps:**
1. Navigate to `/mcp` (MCP Servers page)
2. Click "Add Server" button
3. Fill in:
   - Name: "Test Server"
   - URL: "https://dfo.solaria.agency/mcp"
   - Transport: HTTP
   - Auth Type: Bearer
   - Auth Token: "default"
4. Click "Save"

**Expected:**
- Server appears in list with "Unknown" status
- Toast notification confirms creation

### Scenario 2: Test Server Connection

**Steps:**
1. From MCP Servers list, click "Test" button on a server
2. Wait for connection test to complete

**Expected:**
- Status updates to "Connected" (green) or "Error" (red)
- Latency displayed if connected
- Error message shown if failed

### Scenario 3: Toggle Server Enable/Disable

**Steps:**
1. Click the toggle switch on any server row
2. Observe the server state change

**Expected:**
- Switch toggles visually
- Toast confirms "Server enabled/disabled"
- Disabled servers show muted styling

### Scenario 4: Edit MCP Server

**Steps:**
1. Click "Edit" button on a server
2. Modify the URL or name
3. Click "Save"

**Expected:**
- Modal closes
- Server list updates with new values
- Toast confirms update

### Scenario 5: Delete MCP Server

**Steps:**
1. Click "Delete" button on a server
2. Confirm deletion in the dialog

**Expected:**
- Server removed from list
- Toast confirms deletion

### Scenario 6: MCP Tools in Chat (Future)

**Prerequisites:**
- At least one enabled MCP server with tools

**Steps:**
1. Navigate to Chat interface
2. Start a new conversation
3. Ask AI to use an MCP tool

**Expected:**
- AI can list available MCP tools
- Tool execution shows in tool renderer
- Results returned to conversation

---

## API Endpoint Tests

### Test MCP Server CRUD via cURL

```bash
# Set variables
API_URL="https://vibe.solaria.agency/api"
TOKEN="your-auth-token"

# List servers
curl -H "Authorization: Bearer $TOKEN" "$API_URL/mcp"

# Create server
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","url":"http://localhost:3001","transport":"http","authType":"none"}' \
  "$API_URL/mcp"

# Get server
curl -H "Authorization: Bearer $TOKEN" "$API_URL/mcp/{serverId}"

# Update server
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}' \
  "$API_URL/mcp/{serverId}"

# Test connection
curl -X POST -H "Authorization: Bearer $TOKEN" \
  "$API_URL/mcp/{serverId}/test"

# Toggle enabled
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  "$API_URL/mcp/{serverId}/toggle"

# Delete server
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "$API_URL/mcp/{serverId}"
```

---

## MCPManager Integration Tests

### Test: Server Connection with HTTP Transport

```typescript
const servers = [{
  id: 'test-1',
  name: 'SOLARIA DFO',
  url: 'https://dfo.solaria.agency/mcp',
  transport: 'http',
  authType: 'bearer',
  authToken: 'default',
  enabled: true
}];

await mcpManager.initializeWithServers(servers);
console.log('Connected:', mcpManager.isConnected());
console.log('Tools:', mcpManager.getAvailableToolNames());
```

### Test: Tool Execution

```typescript
// After initialization
const result = await mcpManager.executeTool('list_projects', {});
console.log('Result:', result);
```

### Test: Error Recovery

```typescript
// Test with invalid URL
const servers = [{
  id: 'bad-server',
  name: 'Invalid',
  url: 'http://nonexistent:9999/mcp',
  transport: 'http',
  authType: 'none',
  enabled: true
}];

// Should not throw, should log error
await mcpManager.initializeWithServers(servers);
console.log('Connected (should be false):', mcpManager.isConnected());
```

---

## Playwright E2E Tests (Future)

When Playwright is configured, add tests in `e2e/mcp.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('MCP Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mcp');
  });

  test('should display MCP servers page', async ({ page }) => {
    await expect(page.getByText('MCP Servers')).toBeVisible();
  });

  test('should add new server', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Server' }).click();
    await page.getByLabel('Name').fill('Test Server');
    await page.getByLabel('URL').fill('http://localhost:3001/mcp');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Test Server')).toBeVisible();
  });

  test('should test server connection', async ({ page }) => {
    // Assuming a server exists
    await page.getByRole('button', { name: 'Test' }).first().click();
    await expect(page.getByText(/Connected|Error/)).toBeVisible();
  });
});
```

---

## Test Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| MCPManager class | 80% | 0% (blocked) |
| MCP API endpoints | 70% | 0% (blocked) |
| MCP Settings UI | 60% | N/A (manual) |
| Integration E2E | 5 scenarios | 6 documented |

---

## Known Issues

1. **Vitest version mismatch** - `@vitest/coverage-v8` needs to match vitest major version
2. **Cloudflare Workers pool** - Tests require proper miniflare configuration
3. **D1 mocking** - Need to set up D1 database mocks for unit tests

## Next Steps

1. Fix vitest dependency: `pnpm add -D @vitest/coverage-v8@3`
2. Configure Playwright for E2E tests
3. Add mock D1 database for unit tests
4. Implement remaining unit tests after dependency fix
