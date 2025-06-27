# Jira MCP Server
A Model Context Protocol (MCP) server that connects Jira with Claude.

## Features
- **Issue Search**: Search Jira issues using JQL
- **Issue Retrieval**: View detailed information of specific issues
- **Issue Creation**: Create new Jira issues
- **Issue Update**: Modify existing issues (title, description, status, assignee)
- **Add Comments**: Add comments to issues
- **Project Information**: Retrieve project information

## Installation and Setup

### 1. Environment Variable Configuration
Create a `.env` file and enter the following information:
```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@domain.com
JIRA_API_TOKEN=your-api-token
DEFAULT_PROJECT_KEY=PROJ
```
**Note**: Configuration files are automatically created in the `config/` folder.

### 2. Generate Jira API Token
1. Log in to Jira
2. Account Settings > Security > Generate API Token
3. Enter the generated token in the `JIRA_API_TOKEN` field of the `.env` file

### 3. Install Dependencies
```bash
npm install
```

### 4. Automatic Setup (Recommended)
You can easily set up using the interactive configuration tool:
```bash
npm run setup
```
This command:
- Prompts for Jira connection information
- Automatically creates the `config/.env` file
- Automatically creates the `config/claude_desktop_config.json` file
- Provides guidance on Claude Desktop configuration

### 5. Manual Setup (Optional)
If you prefer manual setup instead of automatic setup, copy the `config/.env.example` file, rename it to `config/.env`, and modify the values.

### 6. Start Server
```bash
npm start
```

## Claude Desktop Configuration
To use this MCP server in Claude Desktop, you need to modify the configuration file.

### Windows
Edit the `%APPDATA%\\Claude\\claude_desktop_config.json` file:
```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["C:\\path\\to\\jira-mcp-server\\index.js"],
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_USERNAME": "your-email@domain.com",
        "JIRA_API_TOKEN": "your-api-token",
        "DEFAULT_PROJECT_KEY": "PROJ"
      }
    }
  }
}
```

### macOS
Edit the `~/Library/Application Support/Claude/claude_desktop_config.json` file:
```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/jira-mcp-server/index.js"],
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_USERNAME": "your-email@domain.com", 
        "JIRA_API_TOKEN": "your-api-token",
        "DEFAULT_PROJECT_KEY": "PROJ"
      }
    }
  }
}
```

## Usage Examples
You can use the following commands in Claude:

### Issue Search
```
"Find issues with Open status in project PROJ"
```

### Issue Creation
```
"Create a Task issue titled 'New Feature Development' in project PROJ"
```

### Issue Update
```
"Change the status of issue PROJ-123 to 'In Progress'"
```

### Add Comment
```
"Add comment 'Started working on this' to issue PROJ-123"
```

## Supported Tools
1. **search_issues**: Search issues with JQL
2. **get_issue**: Retrieve specific issue
3. **create_issue**: Create new issue
4. **update_issue**: Update issue
5. **add_comment**: Add comment
6. **get_project_info**: Retrieve project information

## Troubleshooting

### Authentication Errors
- Verify that the Jira URL is correct
- Check if the API token is valid
- Ensure the user email is accurate

### Permission Errors
- Verify that the user has access permissions to the project
- Check if there are permissions to create/modify issues

## License
MIT License