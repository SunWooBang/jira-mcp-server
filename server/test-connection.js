#!/usr/bin/env node

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'config', '.env') });

const jiraConfig = {
  url: process.env.JIRA_URL,
  username: process.env.JIRA_USERNAME,
  apiToken: process.env.JIRA_API_TOKEN
};

function getAuthHeaders() {
  const auth = Buffer.from(`${jiraConfig.username}:${jiraConfig.apiToken}`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };
}

async function testConnection() {
  console.log('🔍 Testing Jira connection...');
  console.log(`URL: ${jiraConfig.url}`);
  console.log(`Username: ${jiraConfig.username}`);
  
  try {
    // Test basic connection
    const response = await axios.get(`${jiraConfig.url}/rest/api/3/myself`, {
      headers: getAuthHeaders()
    });
    
    console.log('✅ Connection successful!');
    console.log(`Logged in as: ${response.data.displayName} (${response.data.emailAddress})`);
    
    // Test project access
    console.log('\n🏗️ Testing project access...');
    const projectsResponse = await axios.get(`${jiraConfig.url}/rest/api/3/project`, {
      headers: getAuthHeaders()
    });
    
    console.log(`Found ${projectsResponse.data.length} accessible projects:`);
    projectsResponse.data.forEach(project => {
      console.log(`  • ${project.key}: ${project.name}`);
    });

    // Test issue creation metadata for a project
    if (projectsResponse.data.length > 0) {
      const firstProject = projectsResponse.data[0];
      console.log(`\n🎯 Testing issue creation metadata for project ${firstProject.key}...`);
      
      const metaResponse = await axios.get(`${jiraConfig.url}/rest/api/3/issue/createmeta?projectKeys=${firstProject.key}&expand=projects.issuetypes.fields`, {
        headers: getAuthHeaders()
      });
      
      if (metaResponse.data.projects.length > 0) {
        const project = metaResponse.data.projects[0];
        console.log(`Available issue types for ${project.key}:`);
        project.issuetypes.forEach(issueType => {
          console.log(`  • ${issueType.name} (ID: ${issueType.id})`);
        });
      }
    }

    // Test search functionality
    console.log('\n🔎 Testing search functionality...');
    const searchResponse = await axios.get(`${jiraConfig.url}/rest/api/3/search?jql=ORDER BY created DESC&maxResults=5`, {
      headers: getAuthHeaders()
    });
    
    console.log(`Found ${searchResponse.data.total} total issues (showing first 5):`);
    searchResponse.data.issues.forEach(issue => {
      console.log(`  • ${issue.key}: ${issue.fields.summary}`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('\n💡 This looks like an authentication error. Please check:');
      console.error('  • Your Jira URL is correct');
      console.error('  • Your username/email is correct');
      console.error('  • Your API token is valid and not expired');
    }
  }
}

async function testIssueCreation() {
  console.log('\n🆕 Testing issue creation...');
  
  try {
    // Get first available project
    const projectsResponse = await axios.get(`${jiraConfig.url}/rest/api/3/project`, {
      headers: getAuthHeaders()
    });
    
    if (projectsResponse.data.length === 0) {
      console.log('❌ No projects available for testing');
      return;
    }
    
    const project = projectsResponse.data[0];
    console.log(`Using project: ${project.key} (${project.name})`);
    
    // Get metadata
    const metaResponse = await axios.get(`${jiraConfig.url}/rest/api/3/issue/createmeta?projectKeys=${project.key}&expand=projects.issuetypes.fields`, {
      headers: getAuthHeaders()
    });
    
    const projectMeta = metaResponse.data.projects[0];
    const taskType = projectMeta.issuetypes.find(type => 
      type.name.toLowerCase() === 'task' || 
      type.name.toLowerCase() === 'story' ||
      type.name.toLowerCase().includes('task') ||
      type.name.toLowerCase() === '작업' ||
      type.name.toLowerCase().includes('작업')
    );
    
    if (!taskType) {
      console.log('❌ No suitable issue type found for testing');
      return;
    }
    
    console.log(`Using issue type: ${taskType.name} (ID: ${taskType.id})`);
    
    // Create test issue
    const issueData = {
      fields: {
        project: {
          key: project.key
        },
        summary: `MCP Test Issue - ${new Date().toISOString()}`,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'This is a test issue created by the MCP Jira server to verify functionality.'
                }
              ]
            }
          ]
        },
        issuetype: {
          id: taskType.id
        }
      }
    };
    
    console.log('Creating test issue...');
    const createResponse = await axios.post(`${jiraConfig.url}/rest/api/3/issue`, issueData, {
      headers: getAuthHeaders()
    });
    
    const issueKey = createResponse.data.key;
    console.log(`✅ Successfully created test issue: ${issueKey}`);
    console.log(`URL: ${jiraConfig.url}/browse/${issueKey}`);
    
    return issueKey;
    
  } catch (error) {
    console.error('❌ Issue creation failed!');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response?.data?.errors) {
      console.error('Field errors:');
      Object.entries(error.response.data.errors).forEach(([field, message]) => {
        console.error(`  • ${field}: ${message}`);
      });
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Jira MCP Server Tests\n');
  
  await testConnection();
  await testIssueCreation();
  
  console.log('\n✨ Tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testConnection,
  testIssueCreation,
  runAllTests
};
