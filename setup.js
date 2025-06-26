#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 Jira MCP Server 설정을 시작합니다.\n');

  const jiraUrl = await question('Jira URL (예: https://your-domain.atlassian.net): ');
  const jiraUsername = await question('Jira 사용자 이메일: ');
  const jiraApiToken = await question('Jira API 토큰: ');
  const defaultProject = await question('기본 프로젝트 키 (선택사항): ');

  // .env 파일 생성
  const envContent = `# Jira Configuration
JIRA_URL=${jiraUrl}
JIRA_USERNAME=${jiraUsername}
JIRA_API_TOKEN=${jiraApiToken}
${defaultProject ? `DEFAULT_PROJECT_KEY=${defaultProject}` : '# DEFAULT_PROJECT_KEY=PROJ'}
`;

  fs.writeFileSync('.env', envContent);
  console.log('\n✅ .env 파일이 생성되었습니다.');

  // Claude Desktop 설정 파일 생성
  const isWindows = process.platform === 'win32';
  const currentDir = process.cwd();
  const indexPath = path.join(currentDir, 'index.js');

  const claudeConfig = {
    mcpServers: {
      jira: {
        command: 'node',
        args: [indexPath],
        env: {
          JIRA_URL: jiraUrl,
          JIRA_USERNAME: jiraUsername,
          JIRA_API_TOKEN: jiraApiToken,
          ...(defaultProject && { DEFAULT_PROJECT_KEY: defaultProject })
        }
      }
    }
  };

  const configFileName = 'claude_desktop_config.json';
  fs.writeFileSync(configFileName, JSON.stringify(claudeConfig, null, 2));
  
  console.log(`\\n✅ ${configFileName} 파일이 생성되었습니다.`);
  
  if (isWindows) {
    console.log('\\n📁 Windows에서 Claude Desktop 설정:');
    console.log(`1. %APPDATA%\\Claude\\claude_desktop_config.json 파일을 열어주세요.`);
    console.log(`2. 생성된 ${configFileName} 파일의 내용을 복사하여 붙여넣어주세요.`);
  } else {
    console.log('\\n📁 macOS에서 Claude Desktop 설정:');
    console.log(`1. ~/Library/Application Support/Claude/claude_desktop_config.json 파일을 열어주세요.`);
    console.log(`2. 생성된 ${configFileName} 파일의 내용을 복사하여 붙여넣어주세요.`);
  }

  console.log('\\n🔧 설정 완료 후 Claude Desktop을 재시작해주세요.');
  console.log('\\n🎉 설정이 완료되었습니다! 이제 Claude에서 Jira를 사용할 수 있습니다.');

  rl.close();
}

setup().catch(console.error);
