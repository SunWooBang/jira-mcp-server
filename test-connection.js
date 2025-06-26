#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Jira 연결을 테스트합니다...\n');

  const config = {
    url: process.env.JIRA_URL,
    username: process.env.JIRA_USERNAME,
    apiToken: process.env.JIRA_API_TOKEN
  };

  // 설정 확인
  if (!config.url || !config.username || !config.apiToken) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.');
    console.error('JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN을 .env 파일에 설정해주세요.');
    process.exit(1);
  }

  const auth = Buffer.from(`${config.username}:${config.apiToken}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json'
  };

  try {
    // 자신의 정보 조회로 연결 테스트
    console.log('📡 Jira 서버에 연결 중...');
    const response = await axios.get(`${config.url}/rest/api/3/myself`, { headers });
    
    console.log('✅ Jira 연결 성공!');
    console.log(`👤 사용자: ${response.data.displayName} (${response.data.emailAddress})`);
    console.log(`🏢 Jira 인스턴스: ${config.url}`);
    
    // 접근 가능한 프로젝트 조회
    console.log('\n📋 접근 가능한 프로젝트 조회 중...');
    const projectsResponse = await axios.get(`${config.url}/rest/api/3/project`, { headers });
    
    if (projectsResponse.data.length > 0) {
      console.log('✅ 프로젝트 조회 성공!');
      console.log('📁 접근 가능한 프로젝트:');
      projectsResponse.data.slice(0, 5).forEach(project => {
        console.log(`   • ${project.key}: ${project.name}`);
      });
      if (projectsResponse.data.length > 5) {
        console.log(`   ... 그 외 ${projectsResponse.data.length - 5}개 프로젝트`);
      }
    } else {
      console.log('⚠️  접근 가능한 프로젝트가 없습니다.');
    }

    console.log('\n🎉 모든 테스트가 완료되었습니다!');
    console.log('💡 이제 "npm run setup"을 실행하여 MCP 서버를 설정할 수 있습니다.');

  } catch (error) {
    console.error('❌ Jira 연결 실패!');
    console.error('오류 내용:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('\n🔐 인증 오류입니다. 다음을 확인해주세요:');
      console.error('• Jira 사용자 이메일이 정확한지 확인');
      console.error('• API 토큰이 유효한지 확인');
      console.error('• Jira URL이 올바른지 확인');
    } else if (error.response?.status === 403) {
      console.error('\n🚫 권한 오류입니다. Jira 프로젝트 접근 권한을 확인해주세요.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n🌐 네트워크 오류입니다. Jira URL을 확인해주세요.');
    }
    
    process.exit(1);
  }
}

testConnection();
