# Nana International Website

## Overview
Modern Korean business website for Nana International (나나인터내셔널), a startup center and logistics service platform. The site features a sleek, professional design inspired by WeFun Corp's aesthetic, showcasing business services, pricing tiers, locations, and Chinese import/purchase services.

## Recent Changes (December 14, 2025)
- 단일 도메인 구조로 전환 (Express에서 API + 프론트 함께 서빙)
- Kakao OAuth 서버사이드 리다이렉트 방식으로 변경 (/api/auth/kakao)
- Kakao SDK 초기화 코드 제거 (서버에서 authorize URL 생성)
- SPA fallback을 위한 배포 가이드 추가

## Previous Changes (December 13, 2025)
- API/프론트엔드 분리 지원 추가 (VITE_API_BASE 환경변수)
- CORS 설정 추가 (API 서버 분리 배포 지원)
- CDN 캐시 방지 헤더 강화 (CDN-Cache-Control)
- 모든 API 호출에 API_BASE 적용 (AuthContext, Login, Terms, KakaoCallback)

## Previous Changes (December 7, 2025)
- Implemented Google/Kakao social login system (OAuth 2.0)
- Added authentication pages: Login, MyPage, Terms consent
- Navigation now shows login state with user dropdown menu
- AuthContext/AuthProvider for centralized auth state management
- Designed for Render Flask backend integration (future deployment)
- Education page redesigned to match liveklass.com/service/consulting

## Project Architecture

### Frontend (React + Vite) - Replit
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with Shadcn UI components
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation
- **Typography**: Noto Sans KR (Korean), Inter (English/Latin)
- **Auth**: AuthContext with backend API integration

### Backend (Render + Flask) - Future
- Google OAuth 2.0 / Kakao OAuth 2.0
- JWT or HTTP-Only Session Cookie
- API endpoints: /auth/google, /auth/kakao, /api/me, /api/consent, /api/logout

### Database (Firebase Firestore) - Future
- users collection with: provider, providerId, email, name, phone, profileImage
- Consent fields: agreeTerms, agreePrivacy, agreeMarketing, marketingAgreedAt
- Timestamps: createdAt, lastLoginAt

### Key Components
- **Navigation**: Fixed header with logo, menu items, auth state, user dropdown
- **AuthContext**: Authentication state management with backend API
- **Hero**: Full-width hero section with background image
- **CarouselShowcase**: Horizontal scrolling facility showcase
- **ServiceOverview**: Grid of service offerings
- **StatsSection**: Business performance metrics
- **ClientsSection**: Major client logos display
- **PricingSection**: Three-tier pricing plans
- **StrengthsGrid**: Key competitive advantages
- **CBMCalculator**: Shipping cost calculations
- **ProfitCalculator**: Profit margin analysis
- **ChinaPurchaseSection**: China import service info and form
- **LocationsSection**: Multiple center locations
- **ContactForm**: Contact information and inquiry form
- **Footer**: Site footer with company info

### Pages
- **Home**: Main landing page with all sections
- **Education**: Liveklass-style consulting/education page
- **ChinaPurchase**: China import services
- **StartupCenter**: Startup center information
- **Logistics**: 3PL logistics services
- **Login**: Social login (Google/Kakao)
- **MyPage**: User profile and settings
- **Terms**: Consent page for first-time users

## Authentication Flow
1. User clicks "Google로 시작" or "카카오로 시작" button
2. Redirects to backend `/auth/google` or `/auth/kakao`
3. Backend handles OAuth, creates/updates Firestore user
4. First login: redirects to /terms for consent
5. Backend issues JWT cookie, redirects to frontend
6. Frontend calls `/api/me` to get user info
7. AuthContext stores user state for the session

## Render 배포 설정 (단일 도메인 구조)

### 배포 도메인
- https://nana-renewal-backend.onrender.com

### Render Build Command (중요!)
Vite 빌드 출력(dist/public)을 Express가 찾는 경로(server/public)로 복사해야 합니다:
```bash
npm install && npm run build && mkdir -p server/public && cp -r dist/public/* server/public/
```

### Render Start Command
```bash
npm start
```

### Kakao 개발자 콘솔 설정
- Redirect URI: `https://nana-renewal-backend.onrender.com/api/auth/kakao/callback`

## Environment Variables

### 필수 환경변수 (Render)
| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SESSION_SECRET` | JWT 시크릿 | 랜덤 문자열 |
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 | 카카오 개발자 콘솔에서 발급 |
| `KAKAO_CLIENT_SECRET` | 카카오 Client Secret | 카카오 개발자 콘솔에서 발급 |
| `KAKAO_REDIRECT_URI` | OAuth 콜백 URI | https://nana-renewal-backend.onrender.com/api/auth/kakao/callback |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase 서비스 계정 JSON | {"type":"service_account",...} |

### 프론트엔드 빌드 환경변수 (VITE_ 접두사)
| 변수명 | 설명 |
|--------|------|
| `VITE_FIREBASE_API_KEY` | Firebase API 키 |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth 도메인 |
| `VITE_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID |
| `VITE_FIREBASE_APP_ID` | Firebase 앱 ID |

### 선택적 환경변수
| 변수명 | 설명 |
|--------|------|
| `VITE_API_BASE` | API 서버 주소 (분리 배포 시만 설정) |
| `CORS_ORIGIN` | 추가 허용 origin |

## Design Guidelines
- **Color Scheme**: Modern Korean business aesthetic with primary brand colors
- **Typography**: Noto Sans KR (Korean), Inter (English/Latin)
- **Icons**: Lucide React icons (no emojis)
- **Interactions**: hover-elevate and active-elevate-2 utility classes
- **Buttons**: Use size variants only, no custom padding/hover overrides

## Development
- Run `npm run dev` to start development server
- Frontend: http://localhost:5000
- Backend API: Render (future deployment)

## Testing
- E2E tests use Playwright for browser automation
- Test IDs follow pattern: `{action}-{target}` or `{type}-{content}`

## Key Features
1. **Korean Language Support**: Full Korean language content
2. **Responsive Design**: Mobile-first approach
3. **Social Login**: Google/Kakao OAuth (via backend)
4. **User Management**: Profile page, consent flow
5. **Interactive Calculators**: CBM and Profit calculators
6. **Client Showcase**: Major business clients
7. **Multi-location Support**: Multiple center locations
