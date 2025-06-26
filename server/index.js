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

// Load environment variables with fallback
const envPath = path.join(__dirname, '..', 'config', '.env');
require('dotenv').config({ path: envPath });

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
            name: 'jira_search',
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
            name: 'jira_get_issue',
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
            name: 'jira_create_issue',
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
                  description: 'Issue type (e.g., "작업", "에픽", "하위 작업", "정보공유")',
                  default: '작업'
                },
                priority: {
                  type: 'string',
                  description: 'Issue priority (e.g., "High", "Medium", "Low")',
                  default: 'Medium'
                },
                assignee: {
                  type: 'string',
                  description: 'Assignee email or username (optional)'
                },
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of labels to add to the issue'
                }
              },
              required: ['project', 'summary']
            }
          },
          {
            name: 'jira_update_issue',
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
                assignee: {
                  type: 'string',
                  description: 'Assignee email or username'
                },
                priority: {
                  type: 'string',
                  description: 'Priority (e.g., "High", "Medium", "Low")'
                },
                labels: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of labels to set on the issue'
                }
              },
              required: ['issueKey']
            }
          },
          {
            name: 'jira_transition_issue',
            description: 'Transition an issue to a new status',
            inputSchema: {
              type: 'object',
              properties: {
                issueKey: {
                  type: 'string',
                  description: 'Jira issue key (e.g., "PROJ-123")'
                },
                status: {
                  type: 'string',
                  description: 'New status (e.g., "In Progress", "Done", "To Do")'
                }
              },
              required: ['issueKey', 'status']
            }
          },
          {
            name: 'jira_add_comment',
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
            name: 'jira_get_project_info',
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
          },
          {
            name: 'jira_get_project_issues',
            description: 'Get all issues for a specific project',
            inputSchema: {
              type: 'object',
              properties: {
                projectKey: {
                  type: 'string',
                  description: 'Project key (e.g., "PROJ")'
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 50)',
                  default: 50
                },
                status: {
                  type: 'string',
                  description: 'Filter by status (optional)'
                }
              },
              required: ['projectKey']
            }
          },
          {
            name: 'jira_get_transitions',
            description: 'Get available transitions for an issue',
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
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'jira_search':
            return await this.searchIssues(args);
          case 'jira_get_issue':
            return await this.getIssue(args);
          case 'jira_create_issue':
            return await this.createIssue(args);
          case 'jira_update_issue':
            return await this.updateIssue(args);
          case 'jira_transition_issue':
            return await this.transitionIssue(args);
          case 'jira_add_comment':
            return await this.addComment(args);
          case 'jira_get_project_info':
            return await this.getProjectInfo(args);
          case 'jira_get_project_issues':
            return await this.getProjectIssues(args);
          case 'jira_get_transitions':
            return await this.getTransitions(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error.response?.data?.errorMessages || error.message}`
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

  async makeJiraRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${this.jiraConfig.url}/rest/api/3${endpoint}`,
      headers: this.getAuthHeaders(),
    };
    
    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async searchIssues(args) {
    const { jql, maxResults = 50 } = args;
    
    const response = await this.makeJiraRequest('GET', `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,assignee,priority,created,updated,description`);

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
    
    const response = await this.makeJiraRequest('GET', `/issue/${issueKey}`);

    const issue = response.data;
    const description = this.extractDescription(issue.fields.description);
    
    const result = {
      key: issue.key,
      summary: issue.fields.summary,
      description: description,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      priority: issue.fields.priority?.name || 'None',
      issueType: issue.fields.issuetype.name,
      created: issue.fields.created,
      updated: issue.fields.updated,
      labels: issue.fields.labels || [],
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
                `**Labels**: ${result.labels.join(', ') || 'None'}\n` +
                `**Created**: ${result.created}\n` +
                `**Updated**: ${result.updated}\n` +
                `**URL**: ${result.url}`
        }
      ]
    };
  }

  extractDescription(description) {
    if (!description) return 'No description';
    
    // Handle Atlassian Document Format (ADF)
    if (description.type === 'doc' && description.content) {
      let text = '';
      for (const content of description.content) {
        if (content.type === 'paragraph' && content.content) {
          for (const textContent of content.content) {
            if (textContent.type === 'text') {
              text += textContent.text;
            }
          }
          text += '\n';
        }
      }
      return text.trim() || 'No description';
    }
    
    // Handle plain text
    if (typeof description === 'string') {
      return description;
    }
    
    return 'No description';
  }

  async createIssue(args) {
    const { project, summary, description = '', issueType = '작업', priority = 'Medium', assignee, labels } = args;

    // First, get project details to validate
    try {
      await this.makeJiraRequest('GET', `/project/${project}`);
    } catch (error) {
      throw new Error(`Project ${project} not found or not accessible`);
    }

    // Get available issue types for the project
    const projectMetaResponse = await this.makeJiraRequest('GET', `/issue/createmeta?projectKeys=${project}&expand=projects.issuetypes.fields`);
    
    const projectMeta = projectMetaResponse.data.projects[0];
    if (!projectMeta) {
      throw new Error(`Unable to get metadata for project ${project}`);
    }

    // Find the issue type
    const issueTypeObj = projectMeta.issuetypes.find(type => 
      type.name.toLowerCase() === issueType.toLowerCase()
    );
    
    if (!issueTypeObj) {
      const availableTypes = projectMeta.issuetypes.map(type => type.name).join(', ');
      throw new Error(`Issue type "${issueType}" not found. Available types: ${availableTypes}`);
    }

    const issueData = {
      fields: {
        project: {
          key: project
        },
        summary,
        issuetype: {
          id: issueTypeObj.id
        }
      }
    };

    // Add description if provided
    if (description) {
      issueData.fields.description = {
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

    // Add priority if the field is available
    const priorityField = issueTypeObj.fields.priority;
    if (priorityField && priority) {
      const allowedPriorities = priorityField.allowedValues || [];
      const priorityObj = allowedPriorities.find(p => 
        p.name.toLowerCase() === priority.toLowerCase()
      );
      
      if (priorityObj) {
        issueData.fields.priority = {
          id: priorityObj.id
        };
      }
    }

    // Add assignee if provided
    if (assignee) {
      issueData.fields.assignee = {
        emailAddress: assignee
      };
    }

    // Add labels if provided
    if (labels && Array.isArray(labels)) {
      issueData.fields.labels = labels;
    }

    const response = await this.makeJiraRequest('POST', '/issue', issueData);

    const issueKey = response.data.key;
    const issueUrl = `${this.jiraConfig.url}/browse/${issueKey}`;

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully created issue: **${issueKey}**\n` +
                `Summary: ${summary}\n` +
                `Type: ${issueType}\n` +
                `Priority: ${priority}\n` +
                `Project: ${project}\n` +
                `URL: ${issueUrl}`
        }
      ]
    };
  }

  async updateIssue(args) {
    const { issueKey, summary, description, assignee, priority, labels } = args;
    
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

    if (priority) {
      updateData.fields.priority = { name: priority };
    }

    if (labels && Array.isArray(labels)) {
      updateData.fields.labels = labels;
    }

    // Update fields
    if (Object.keys(updateData.fields).length > 0) {
      await this.makeJiraRequest('PUT', `/issue/${issueKey}`, updateData);
    }

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully updated issue: **${issueKey}**\n` +
                `URL: ${this.jiraConfig.url}/browse/${issueKey}`
        }
      ]
    };
  }

  async transitionIssue(args) {
    const { issueKey, status } = args;

    // Get available transitions
    const transitionsResponse = await this.makeJiraRequest('GET', `/issue/${issueKey}/transitions`);
    
    const transition = transitionsResponse.data.transitions.find(t => 
      t.to.name.toLowerCase() === status.toLowerCase()
    );
    
    if (!transition) {
      const availableStatuses = transitionsResponse.data.transitions.map(t => t.to.name).join(', ');
      throw new Error(`Status "${status}" not available. Available statuses: ${availableStatuses}`);
    }

    await this.makeJiraRequest('POST', `/issue/${issueKey}/transitions`, {
      transition: { id: transition.id }
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully transitioned issue **${issueKey}** to **${status}**\n` +
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

    await this.makeJiraRequest('POST', `/issue/${issueKey}/comment`, commentData);

    return {
      content: [
        {
          type: 'text',
          text: `✅ Successfully added comment to issue: **${issueKey}**\n` +
                `Comment: ${comment}\n` +
                `URL: ${this.jiraConfig.url}/browse/${issueKey}`
        }
      ]
    };
  }

  async getProjectInfo(args) {
    const { projectKey } = args;

    const response = await this.makeJiraRequest('GET', `/project/${projectKey}`);

    const project = response.data;
    
    return {
      content: [
        {
          type: 'text',
          text: `**Project**: ${project.name} (${project.key})\n` +
                `**Description**: ${project.description || 'No description'}\n` +
                `**Lead**: ${project.lead?.displayName || 'No lead assigned'}\n` +
                `**Project Type**: ${project.projectTypeKey}\n` +
                `**URL**: ${this.jiraConfig.url}/projects/${project.key}`
        }
      ]
    };
  }

  async getProjectIssues(args) {
    const { projectKey, maxResults = 50, status } = args;
    
    let jql = `project = ${projectKey}`;
    if (status) {
      jql += ` AND status = "${status}"`;
    }
    jql += ' ORDER BY created DESC';

    return await this.searchIssues({ jql, maxResults });
  }

  async getTransitions(args) {
    const { issueKey } = args;

    const response = await this.makeJiraRequest('GET', `/issue/${issueKey}/transitions`);
    
    const transitions = response.data.transitions.map(transition => ({
      id: transition.id,
      name: transition.name,
      to: transition.to.name
    }));

    return {
      content: [
        {
          type: 'text',
          text: `Available transitions for **${issueKey}**:\n\n` +
                transitions.map(t => `• **${t.name}** → ${t.to}`).join('\n') +
                `\n\nURL: ${this.jiraConfig.url}/browse/${issueKey}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Silent mode - no console output to avoid JSON parsing errors
  }
}

const server = new JiraServer();
server.run().catch(console.error);
