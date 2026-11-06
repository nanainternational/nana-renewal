# 관리자 전용 웹 통합수집기 (초기 연동)

## 목적

나나인터내셔널 관리자만 `/admin/collector`에서 중앙 수집기를 실행·중지하고 상태를 확인합니다.
모든 직원 PC마다 EXE를 교체하지 않습니다. **중앙 Windows PC 또는 Windows VM 한 대**에
기존 `nana_unified_collector_v1.4.2.py`를 유지하고, 그 프로그램의 수집 로직을 재사용합니다.

> 주의: 이는 수집기가 브라우저 자체에서 실행되는 방식이 아닙니다.
> 웹 UI는 명령을 전달하고, 실제 Chrome/Selenium 수집은 중앙 Windows 수집기에서 실행됩니다.
> 중앙 실행 에이전트를 설치/시작하기 전에는 시작 버튼이 비활성화됩니다.

## 구성

- 프론트: `client/src/pages/AdminCollector.tsx`
- 관리자 메뉴: `client/src/components/Navigation.tsx` (OWNER/ADMIN에게만 표시)
- 서버 API: `server/collector-service.ts` (Express + Postgres)
- 중앙 실행 에이전트: `tools/collector_web_agent.py`
- 기존 통합수집기: **코드 변경 없음** (Windows PC에 별도 보관)

지원: 에이블리, 4910, 지그재그, 도매꾹. 쿠팡은 현재 통합수집기 v1.4.2에
포함되어 있지 않아 별도 수집기 연동이 필요합니다.

## 간편 연결 (권장)

1. 관리자 로그인 후 `https://nanainter.com/admin/collector`에 접속합니다.
2. **연결 코드 발급** 버튼을 눌러 10분 동안 유효한 1회용 코드를 발급합니다.
3. 중앙으로 사용할 Windows 수집기 PC에 최신 `tools/collector_web_agent.py` 파일을 받습니다.
4. 수집기의 Python 환경에서 `python collector_web_agent.py`를 실행합니다.
   - Windows에 Python 및 기존 수집기의 의존 패키지가 설치되어 있어야 합니다.
   - 프로그램이 기존 통합수집기 파일을 못 찾으면 선택 창으로 지정합니다.
   - 위에서 발급한 연결 코드를 한 번만 입력하면 이 PC의 사용자 프로필에 자격증명이 저장됩니다.
5. 관리자 화면에 **1대 연결됨**이 표시되는지 확인합니다.

Render 환경변수 `COLLECTOR_WORKER_TOKEN`은 간편 연결 방식에서는 **필수가 아닙니다**.
기존에 설정한 값이 있다면 이전 연결 프로그램과의 호환을 위해 그대로 유지할 수 있습니다.
저장된 자격증명을 재설정해야 하는 경우 PC의 `%LOCALAPPDATA%\\NanaCollector\\agent.json`을
안전하게 삭제한 뒤 다시 연결 코드를 입력하세요.

## 서버 배포

1. 홈페이지 배포에 해당 변경사항을 반영합니다.
2. Render Web Service의 환경변수 `SESSION_SECRET`가 충분히 긴 난수(32자 이상)인지 확인합니다.
3. **레거시 방식으로만** 연결하는 경우 Render Web Service에 `COLLECTOR_WORKER_TOKEN`을 32자 이상의 난수로 설정합니다.
   - 예: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
   - **토큰을 GitHub, 브라우저, 대화 로그에 절대 커밋하지 마세요.**
4. 브라우저와 API가 다른 origin에서 운영되는 경우 `COLLECTOR_ALLOWED_ORIGINS`에
   신뢰하는 origin 목록을 쉼표로 지정합니다. 예: `https://nanainter.com`.
5. 서버 최초 관리자 요청 시 `collector_jobs`, `collector_workers`,
   `collector_job_events` 테이블과 중복 작업 방지 인덱스가 생성됩니다.
   이 테이블들은 생성 트랜잭션 내에서 RLS를 활성화하고 anon/authenticated 권한을 제거합니다.
   데이터베이스 권한상 DDL이 불가능하면 별도의 SQL 마이그레이션이 필요합니다.

## 중앙 Windows 수집기 설치

1. 기존 통합수집기가 정상 동작하는 **한 대**를 중앙 실행 PC로 지정합니다.
   전원/로그인 세션/Chrome 프로필/Google 시트 인증 상태를 유지합니다.
2. Python 환경에 현재 통합수집기의 필수 패키지를 설치합니다.
   예: `pip install requests customtkinter selenium undetected-chromedriver pandas gspread google-auth-oauthlib google-auth pillow openpyxl`.
   다른 내장 모듈이 추가 패키지를 요구하면 기존 설치 환경을 우선 재사용합니다.
3. 웹 에이전트와 기존 수집기 파일을 같은 폴더에 놓거나
   `NANA_COLLECTOR_FILE`로 원본 경로를 지정합니다.
4. 다음 명령을 Windows PowerShell에서 실행합니다.

```powershell
$env:COLLECTOR_API_BASE = "https://nanainter.com"
$env:COLLECTOR_WORKER_TOKEN = "<Render에 설정한 동일한 비밀 토큰>"
$env:NANA_COLLECTOR_FILE = "C:\collector\nana_unified_collector_v1.4.2.py"
python C:\collector\collector_web_agent.py
```

5. 콘솔이 열리고 기존 통합수집기 GUI가 뜨면 기존 URL/검색어 및 Google 시트 설정을
   확인합니다. GUI가 떠 있는 상태에서 웹에서 작업 시작/중지를 요청합니다.
6. `/admin/collector` 화면의 "중앙 수집기 연결"에 PC가 표시되는지 확인합니다.

### Windows 자동 시작

- Windows 작업 스케줄러에서 **사용자 로그온 시** 실행하도록 등록할 수 있습니다.
- Chrome/Tkinter가 필요하므로 `사용자의 로그온 여부에 관계없이 실행`을 선택하지 않습니다.
- 서버 부팅 직후 비로그인 환경에서 실행할 목적이라면 GUI 제거/헤드리스 엔진 분리 후
  별도의 작업자 서비스로 전환해야 합니다.

## 기능/제약

- OWNER/ADMIN만 메뉴 및 API 이용 가능; VIEWER는 허용하지 않습니다.
- 웹 작업은 Postgres에 보관되므로 웹페이지를 닫아도 진행 중인 작업은 유지됩니다.
- **플랫폼별 활성 작업 1개** 제한 (고유 인덱스로 중복 방지).
- 중앙 에이전트는 한 번에 작업 1건씩 실행하며 다른 플랫폼 작업은 대기열로 처리됩니다.
- 관리자 중지 요청은 기존 프로그램의 `stop()` 함수를 호출합니다.
  기존 수집기의 저장/중지 동작을 그대로 따릅니다.
- 중앙 PC 오프라인이면 웹의 시작 버튼이 비활성화됩니다.
- 수집기별 기존 GUI의 URL/키워드·시트 설정을 사용합니다.
  웹에서 설정 자체를 편집하는 기능은 추후 수집기별 데이터 모델 분리 후 추가해야 합니다.
- 웹 로그는 에이전트의 상태 요약/오류/완료 메시지를 저장합니다.
  기존 GUI 텍스트 로그 전체를 동기화하지는 않습니다.
- 통합수집기 기본 GUI는 오류나 로그인 요청 시 중앙 PC에서 확인해야 할 수 있습니다.
- 업데이트는 중앙 PC 한 대에만 필요합니다. 원본 프로그램 코드의 원격 자동배포는
  아직 제공하지 않으며 향후 버전 서명/롤백과 함께 추가해야 합니다.
- 중앙 PC가 중도 종료되면 이미 'running'으로 할당된 작업의 자동 복구는 지원하지
  않습니다. 재시작 시 기존 작업 실행 여부를 운영자가 확인한 후 상태 복구 로직을
  별도로 구축해야 합니다. 중복 수집을 막기 위해 무조건 재시작하지 않습니다.
- 완전 무PC 서버형 서비스는 GUI 제거 및 Chrome 실행 서버 분리가 필요한 다음 단계입니다.

## 보안

- 브라우저에는 `COLLECTOR_WORKER_TOKEN`이 전달되지 않습니다.
- 작업 생성/중지 API는 서버에서 세션과 활성 관리자 역할을 재검증합니다.
- POST API는 Origin 검사를 수행하여 크로스 사이트 요청을 차단합니다.
- 작업자는 HTTPS와 공유 비밀 토큰으로만 통신합니다.
- 외부 API로 셸 명령·임의 URL·쿠키/Google 인증파일을 받거나 실행하지 않습니다.
- 수집 결과는 기존 시트 저장 방식대로 처리되며, 웹 서버로 원시 개인정보를 업로드하지 않습니다.
