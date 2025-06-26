# Jira MCP Server

Jira와 Claude를 연결하는 Model Context Protocol (MCP) 서버입니다.

## 기능

- **이슈 검색**: JQL을 사용하여 Jira 이슈 검색
- **이슈 조회**: 특정 이슈의 상세 정보 확인
- **~~이슈 생성~~**: 새로운 Jira 이슈 생성 >>> 생성이 되지 않는 에러가 있습니다. 현재 수정중에 있습니다.
- **이슈 업데이트**: 기존 이슈 수정 (제목, 설명, 상태, 담당자)
- **댓글 추가**: 이슈에 댓글 추가
- **프로젝트 정보**: 프로젝트 정보 조회

## 설치 및 설정

### 1. 환경 변수 설정

`.env` 파일을 생성하고 다음 정보를 입력하세요:

```env
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@domain.com
JIRA_API_TOKEN=your-api-token
DEFAULT_PROJECT_KEY=PROJ
```

### 2. Jira API 토큰 생성

1. Jira에 로그인
2. 계정 설정 > 보안 > API 토큰 생성
3. 생성된 토큰을 `.env` 파일의 `JIRA_API_TOKEN`에 입력

### 3. 의존성 설치

```bash
npm install
```

### 4. 서버 실행

```bash
npm start
```

## Claude Desktop 설정

Claude Desktop에서 이 MCP 서버를 사용하려면 설정 파일을 수정해야 합니다.

### Windows
`%APPDATA%\\Claude\\claude_desktop_config.json` 파일을 편집:

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
`~/Library/Application Support/Claude/claude_desktop_config.json` 파일을 편집:

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

## 사용 예시

Claude에서 다음과 같은 명령을 사용할 수 있습니다:

### 이슈 검색
```
"프로젝트 PROJ에서 상태가 Open인 이슈들을 찾아줘"
```

### 이슈 생성
```
"PROJ 프로젝트에 '새로운 기능 개발' 제목으로 Task 이슈를 생성해줘"
```

### 이슈 업데이트
```
"PROJ-123 이슈의 상태를 'In Progress'로 변경해줘"
```

### 댓글 추가
```
"PROJ-123 이슈에 '작업을 시작했습니다' 댓글을 추가해줘"
```

## 지원하는 도구

1. **search_issues**: JQL로 이슈 검색
2. **get_issue**: 특정 이슈 조회
3. **create_issue**: 새 이슈 생성
4. **update_issue**: 이슈 업데이트
5. **add_comment**: 댓글 추가
6. **get_project_info**: 프로젝트 정보 조회

## 문제 해결

### 인증 오류
- Jira URL이 올바른지 확인
- API 토큰이 유효한지 확인
- 사용자 이메일이 정확한지 확인

### 권한 오류
- 사용자가 해당 프로젝트에 접근 권한이 있는지 확인
- 이슈 생성/수정 권한이 있는지 확인

## 라이선스

MIT License
