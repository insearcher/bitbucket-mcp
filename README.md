# Bitbucket MCP

A Model Context Protocol (MCP) server for integrating with Bitbucket Cloud and Server APIs. This MCP server enables AI assistants like Cursor to interact with your Bitbucket repositories, pull requests, and other resources.

## Safety First
This is a safe and responsible package — no DELETE operations are used, so there’s no risk of data loss.
Every pull request is analyzed with CodeQL to ensure the code remains secure.

[![CodeQL](https://github.com/MatanYemini/bitbucket-mcp/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/MatanYemini/bitbucket-mcp/actions/workflows/github-code-scanning/codeql)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue.svg)](https://github.com/MatanYemini/bitbucket-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/bitbucket-mcp.svg)](https://www.npmjs.com/package/bitbucket-mcp)

## Overview
Checkout out the [official npm package](https://www.npmjs.com/package/bitbucket-mcp)
This server implements the Model Context Protocol standard to provide AI assistants with access to Bitbucket data and operations. It includes tools for:

- Listing and retrieving repositories
- Getting repository details
- Fetching pull requests
- And more...

## Installation

### Using NPX (Recommended)

The easiest way to use this MCP server is via NPX, which allows you to run it without installing it globally:

```bash
# Run with environment variables
BITBUCKET_URL="https://bitbucket.org/your-workspace" \
BITBUCKET_USERNAME="your-username" \
BITBUCKET_PASSWORD="your-app-password" \
npx -y bitbucket-mcp@latest
```

### Manual Installation

Alternatively, you can install it globally or as part of your project:

```bash
# Install globally
npm install -g bitbucket-mcp

# Or install in your project
npm install bitbucket-mcp
```

Then run it with:

```bash
# If installed globally
BITBUCKET_URL="https://bitbucket.org/your-workspace" \
BITBUCKET_USERNAME="your-username" \
BITBUCKET_PASSWORD="your-app-password" \
bitbucket-mcp

# If installed in your project
BITBUCKET_URL="https://bitbucket.org/your-workspace" \
BITBUCKET_USERNAME="your-username" \
BITBUCKET_PASSWORD="your-app-password" \
npx bitbucket-mcp
```

## Configuration

### Environment Variables

Configure the server using the following environment variables:

| Variable              | Description                                                       | Required |
| --------------------- | ----------------------------------------------------------------- | -------- |
| `BITBUCKET_URL`       | Bitbucket base URL (e.g., "https://bitbucket.org/your-workspace") | Yes      |
| `BITBUCKET_USERNAME`  | Your Bitbucket username                                           | Yes\*    |
| `BITBUCKET_PASSWORD`  | Your Bitbucket app password                                       | Yes\*    |
| `BITBUCKET_TOKEN`     | Your Bitbucket access token (alternative to username/password)    | No       |
| `BITBUCKET_WORKSPACE` | Default workspace to use when not specified                       | No       |

\* Either `BITBUCKET_TOKEN` or both `BITBUCKET_USERNAME` and `BITBUCKET_PASSWORD` must be provided.

> **Note about BITBUCKET_WORKSPACE**: If you set this environment variable, it will be used as the default workspace for all operations. For Bitbucket Server, this should be a project key (e.g., "PROJECT-KEY", "DEV"). If not set, you'll need to specify the workspace parameter in each method call. You can use the `listWorkspaces` method to see available workspaces/projects.

### Creating a Bitbucket App Password

1. Log in to your Bitbucket account
2. Go to Personal Settings > App Passwords
3. Create a new app password with the following permissions:
   - Repositories: Read
   - Pull requests: Read, Write
4. Copy the generated password and use it as the `BITBUCKET_PASSWORD` environment variable

## Integration with Cursor

To integrate this MCP server with Cursor:

1. Open Cursor
2. Go to Settings > Extensions
3. Click on "Model Context Protocol"
4. Add a new MCP configuration:

```json
"bitbucket": {
  "command": "npx",
  "env": {
    "BITBUCKET_URL": "https://bitbucket.org/your-workspace",
    "BITBUCKET_USERNAME": "your-username",
    "BITBUCKET_PASSWORD": "your-app-password"
  },
  "args": ["-y", "bitbucket-mcp@latest"]
}
```

5. Save the configuration
6. Use the "/bitbucket" command in Cursor to access Bitbucket repositories and pull requests

### Using a Local Build with Cursor

If you're developing locally and want to test your changes:

```json
"bitbucket-local": {
  "command": "node",
  "env": {
    "BITBUCKET_URL": "https://bitbucket.org/your-workspace",
    "BITBUCKET_USERNAME": "your-username",
    "BITBUCKET_PASSWORD": "your-app-password"
  },
  "args": ["/path/to/your/local/bitbucket-mcp/dist/index.js"]
}
```

## Available Tools

This MCP server provides tools for interacting with Bitbucket repositories and pull requests. Below is a comprehensive list of the available operations:

### Workspace Operations

#### `listWorkspaces`

Lists available workspaces (projects for Bitbucket Server).

**Parameters:**

- `limit` (optional): Maximum number of workspaces to return (default: 25)

### Repository Operations

#### `listRepositories`

Lists repositories in a workspace.

**Parameters:**

- `workspace` (optional): Bitbucket workspace name
- `limit` (optional): Maximum number of repositories to return

#### `getRepository`

Gets details for a specific repository.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug

### Pull Request Operations

#### `getPullRequests`

Gets pull requests for a repository.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `state` (optional): Pull request state (`OPEN`, `MERGED`, `DECLINED`, `SUPERSEDED`)
- `limit` (optional): Maximum number of pull requests to return

#### `createPullRequest`

Creates a new pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `title`: Pull request title
- `description`: Pull request description
- `sourceBranch`: Source branch name
- `targetBranch`: Target branch name
- `reviewers` (optional): List of reviewer usernames

#### `getPullRequest`

Gets details for a specific pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `updatePullRequest`

Updates a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- Various optional update parameters (title, description, etc.)

#### `getPullRequestActivity`

Gets the activity log for a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `approvePullRequest`

Approves a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `unapprovePullRequest`

Removes an approval from a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `declinePullRequest`

Declines a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `message` (optional): Reason for declining

#### `mergePullRequest`

Merges a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `message` (optional): Merge commit message
- `strategy` (optional): Merge strategy (`merge-commit`, `squash`, `fast-forward`)

#### `requestChanges`

Requests changes on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `removeChangeRequest`

Removes a change request from a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

### Pull Request Comment Operations

#### `getPullRequestComments`

Lists comments on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `createPullRequestComment`

Creates a comment on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `content`: Comment content
- `inline` (optional): Inline comment information

#### `getPullRequestComment`

Gets a specific comment on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `comment_id`: Comment ID

#### `updatePullRequestComment`

Updates a comment on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `comment_id`: Comment ID
- `content`: Updated comment content

#### `deletePullRequestComment`

Deletes a comment on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `comment_id`: Comment ID

#### `resolveComment`

Resolves a comment thread on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `comment_id`: Comment ID

#### `reopenComment`

Reopens a resolved comment thread on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `comment_id`: Comment ID

### Pull Request Diff Operations

#### `getPullRequestDiff`

Gets the diff for a pull request. For large pull requests (>50 files), returns a summary instead of the full diff.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `getPullRequestDiffForFile`

Gets the diff for a specific file in a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `file_path`: Path to the file to get diff for

#### `getPullRequestDiffStat`

Gets the diff statistics for a pull request with file-by-file breakdown.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `limit` (optional): Maximum number of files to return (default: 100)

#### `getPullRequestPatch`

Gets the patch for a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

### Pull Request Task Operations

#### `getPullRequestTasks`

Lists tasks on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `createPullRequestTask`

Creates a task on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `content`: Task content
- `comment` (optional): Comment ID to associate with the task
- `pending` (optional): Whether the task is pending

#### `getPullRequestTask`

Gets a specific task on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `task_id`: Task ID

#### `updatePullRequestTask`

Updates a task on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `task_id`: Task ID
- `content` (optional): Updated task content
- `state` (optional): Updated task state

#### `deletePullRequestTask`

Deletes a task on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID
- `task_id`: Task ID

### Other Pull Request Operations

#### `getPullRequestCommits`

Lists commits on a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

#### `getPullRequestStatuses`

Lists commit statuses for a pull request.

**Parameters:**

- `workspace`: Bitbucket workspace name
- `repo_slug`: Repository slug
- `pull_request_id`: Pull request ID

## Usage Examples

### Working with Large Pull Requests

When working with pull requests that have many changed files, the MCP server provides intelligent handling:

```javascript
// Get statistics for a pull request
const stats = await getPullRequestDiffStat({
  workspace: 'my-workspace',
  repo_slug: 'my-repo',
  pull_request_id: '123'
});
// Returns: { totalFiles: 75, totalLinesAdded: 1500, totalLinesRemoved: 300, ... }

// Get diff - automatically returns summary for large PRs
const diff = await getPullRequestDiff({
  workspace: 'my-workspace',
  repo_slug: 'my-repo',
  pull_request_id: '123'
});
// For PRs with >50 files, returns:
// {
//   truncated: true,
//   totalFiles: 75,
//   filesChanged: [...], // First 50 files
//   message: "This pull request contains 75 files..."
// }

// Get diff for a specific file
const fileDiff = await getPullRequestDiffForFile({
  workspace: 'my-workspace',
  repo_slug: 'my-repo',
  pull_request_id: '123',
  file_path: 'src/main.js'
});
```

### Docker Usage

Run the MCP server in a Docker container:

```bash
# Build the image
docker build -t bitbucket-mcp .

# Run with environment variables
docker run --rm -i \
  -e BITBUCKET_URL=https://your-bitbucket-server.com \
  -e BITBUCKET_USERNAME=your-username \
  -e BITBUCKET_PASSWORD=your-app-password \
  -e BITBUCKET_WORKSPACE=your-workspace \
  bitbucket-mcp
```

### Bitbucket Server Compatibility

The MCP server automatically detects and adapts to Bitbucket Server/Data Center instances:
- API endpoints are automatically translated
- Response formats are converted to match Cloud API
- No additional configuration needed

**Important Note about Workspaces:**
- For Bitbucket Cloud: workspace = workspace slug (e.g., "my-company")
- For Bitbucket Server: workspace = project key (e.g., "PROJECT-KEY", "DEV", "PROD")

If you're getting 401 errors on Bitbucket Server, it's likely because:
1. The workspace parameter should be a valid project key (not a slug)
2. Project keys are typically uppercase letters, sometimes with hyphens

Use the `listWorkspaces` method to see all available projects:
```javascript
// This will show all projects you have access to
const workspaces = await listWorkspaces();
// Returns: [{key: "PROJECT-KEY", name: "Project Name"}, ...]
```

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/MatanYemini/bitbucket-mcp.git
cd bitbucket-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [GitHub Repository](https://github.com/MatanYemini/bitbucket-mcp)
- [npm Package](https://www.npmjs.com/package/bitbucket-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Bitbucket REST API - Pull Requests](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/)
