#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} = require('@modelcontextprotocol/sdk/types.js');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

class JiraServer {
  constructor() {
    this.server = new Server(
      {
        name: 'jira-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.jiraConfig = {
      url: process.env.JIRA_URL,
      username: process.env.JIRA_USERNAME,
      apiToken: process.env.JIRA_API_TOKEN,
      defaultProject: process.env.DEFAULT_PROJECT_KEY || 'PROJ'
    };

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_issues',
            description: 'Search Jira issues using JQL (Jira Query Language)',
            inputSchema: {
              type: 'object',
              properties: {
                jql: {
                  type: 'string',
                  description: 'JQL query string (e.g., "project = PROJ AND status = Open")'
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 50)',
                  default: 50
                }
              },
              required: ['jql']
            }
          },
          {
            name: 'get_issue',
            description: 'Get detailed information about a specific Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'Jira issue key (e.g., "PROJ-123")'
                }
              },
              required: ['issueKey']
            }
          },
          {
            name: 'create_issue',
            description: 'Create a new Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                project: {
                  type: 'string',
                  description: 'Project key (e.g., "PROJ")'
                },
                summary: {
                  type: 'string',
                  description: 'Issue summary/title'
                },
                description: {
                  type: 'string',
                  description: 'Issue description'
                },
                issueType: {
                  type: 'string',
                  description: 'Issue type (e.g., "Bug", "Task", "Story")',
                  default: 'Task'
                },
                priority: {
                  type: 'string',
                  description: 'Issue priority (e.g., "High", "Medium", "Low")',
                  default: 'Medium'
                }
              },
              required: ['project', 'summary']
            }
          },
          {
            name: 'update_issue',
            description: 'Update an existing Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'Jira issue key (e.g., "PROJ-123")'
                },
                summary: {
                  type: 'string',
                  description: 'New summary/title'
                },
                description: {
                  type: 'string',
                  description: 'New description'
                },
                status: {
                  type: 'string',
                  description: 'New status (e.g., "In Progress", "Done")'
                },
                assignee: {
                  type: 'string',
                  description: 'Assignee email or username'
                }
              },
              required: ['issueKey']
            }
          },
          {
            name: 'add_comment',
            description: 'Add a comment to a Jira issue',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'Jira issue key (e.g., "PROJ-123")'
                },
                comment: {
                  type: 'string',
                  description: 'Comment text'
                }
              },
              required: ['issueKey', 'comment']
            }
          },
          {
            name: 'get_project_info',
            description: 'Get information about a Jira project',
            inputSchema: {
              type: 'object',
              properties: {
                projectKey: {
                  type: 'string',
                  description: 'Project key (e.g., "PROJ")'
                }
              },
              required: ['projectKey']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_issues':
            return await this.searchIssues(args);
          case 'get_issue':
            return await this.getIssue(args);
          case 'create_issue':
            return await this.createIssue(args);
          case 'update_issue':
            return await this.updateIssue(args);
          case 'add_comment':
            return await this.addComment(args);
          case 'get_project_info':
            return await this.getProjectInfo(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error.message}`
        );
      }
    });
  }

  getAuthHeaders() {
    const auth = Buffer.from(`${this.jiraConfig.username}:${this.jiraConfig.apiToken}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async searchIssues(args) {
    const { jql, maxResults = 50 } = args;
    
    const response = await axios.get(`${this.jiraConfig.url}/rest/api/3/search`, {
      headers: this.getAuthHeaders(),
      params: {
        jql,
        maxResults,
        fields: 'summary,status,assignee,priority,created,updated,description'
      }
    });

    const issues = response.data.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      priority: issue.fields.priority?.name || 'None',
      created: issue.fields.created,
      updated: issue.fields.updated,
      url: `${this.jiraConfig.url}/browse/${issue.key}`
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Found ${issues.length} issues:\n\n` + 
                issues.map(issue => 
                  `**${issue.key}**: ${issue.summary}\n` +
                  `Status: ${issue.status} | Assignee: ${issue.assignee} | Priority: ${issue.priority}\n` +
                  `URL: ${issue.url}\n`
                ).join('\n')
        }
      ]
    };
  }

  async getIssue(args) {
    const { issueKey } = args;
    
    const response = await axios.get(`${this.jiraConfig.url}/rest/api/3/issue/${issueKey}`, {
      headers: this.getAuthHeaders()
    });

    const issue = response.data;
    const result = {
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description?.content?.[0]?.content?.[0]?.text || 'No description',
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      priority: issue.fields.priority?.name || 'None',
      issueType: issue.fields.issuetype.name,
      created: issue.fields.created,
      updated: issue.fields.updated,
      url: `${this.jiraConfig.url}/browse/${issue.key}`
    };

    return {
      content: [
        {
          type: 'text',
          text: `**${result.key}**: ${result.summary}\n\n` +
                `**Description**: ${result.description}\n` +
                `**Status**: ${result.status}\n` +
                `**Assignee**: ${result.assignee}\n` +
                `**Priority**: ${result.priority}\n` +
                `**Type**: ${result.issueType}\n` +
                `**Created**: ${result.created}\n` +
                `**Updated**: ${result.updated}\n` +
                `**URL**: ${result.url}`
        }
      ]
    };
  }

  async createIssue(args) {
    const { project, summary, description = '', issueType = 'Task', priority = 'Medium' } = args;

    const issueData = {
      fields: {
        project: {
          key: project
        },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: description
                }
              ]
            }
          ]
        },
        issuetype: {
          name: issueType
        },
        priority: {
          name: priority
        }
      }
    };

    const response = await axios.post(`${this.jiraConfig.url}/rest/api/3/issue`, issueData, {
      headers: this.getAuthHeaders()
    });

    const issueKey = response.data.key;
    const issueUrl = `${this.jiraConfig.url}/browse/${issueKey}`;

    return {
      content: [
        {
          type: 'text',
          text: `Successfully created issue: **${issueKey}**\n` +
                `Summary: ${summary}\n` +
                `Type: ${issueType}\n` +
                `Priority: ${priority}\n` +
                `URL: ${issueUrl}`
        }
      ]
    };
  }

  async updateIssue(args) {
    const { issueKey, summary, description, status, assignee } = args;
    
    const updateData = { fields: {} };
    
    if (summary) updateData.fields.summary = summary;
    if (description) {
      updateData.fields.description = {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: description
              }
            ]
          }
        ]
      };
    }
    if (assignee) {
      updateData.fields.assignee = { emailAddress: assignee };
    }

    // Update fields
    if (Object.keys(updateData.fields).length > 0) {
      await axios.put(`${this.jiraConfig.url}/rest/api/3/issue/${issueKey}`, updateData, {
        headers: this.getAuthHeaders()
      });
    }

    // Handle status transition separately
    if (status) {
      // Get available transitions
      const transitionsResponse = await axios.get(`${this.jiraConfig.url}/rest/api/3/issue/${issueKey}/transitions`, {
        headers: this.getAuthHeaders()
      });
      
      const transition = transitionsResponse.data.transitions.find(t => t.to.name === status);
      if (transition) {
        await axios.post(`${this.jiraConfig.url}/rest/api/3/issue/${issueKey}/transitions`, {
          transition: { id: transition.id }
        }, {
          headers: this.getAuthHeaders()
        });
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Successfully updated issue: **${issueKey}**\n` +
                `URL: ${this.jiraConfig.url}/browse/${issueKey}`
        }
      ]
    };
  }

  async addComment(args) {
    const { issueKey, comment } = args;

    const commentData = {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: comment
              }
            ]
          }
        ]
      }
    };

    await axios.post(`${this.jiraConfig.url}/rest/api/3/issue/${issueKey}/comment`, commentData, {
      headers: this.getAuthHeaders()
    });

    return {
      content: [
        {
          type: 'text',
          text: `Successfully added comment to issue: **${issueKey}**\n` +
                `Comment: ${comment}\n` +
                `URL: ${this.jiraConfig.url}/browse/${issueKey}`
        }
      ]
    };
  }

  async getProjectInfo(args) {
    const { projectKey } = args;

    const response = await axios.get(`${this.jiraConfig.url}/rest/api/3/project/${projectKey}`, {
      headers: this.getAuthHeaders()
    });

    const project = response.data;
    
    return {
      content: [
        {
          type: 'text',
          text: `**Project**: ${project.name} (${project.key})\n` +
                `**Description**: ${project.description || 'No description'}\n` +
                `**Lead**: ${project.lead?.displayName || 'No lead assigned'}\n` +
                `**Project Type**: ${project.projectTypeKey}\n` +
                `**URL**: ${project.self}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jira MCP server running on stdio');
  }
}

const server = new JiraServer();
server.run().catch(console.error);
