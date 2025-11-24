# Railway + Vercel 배포 가이드

이 가이드는 VR 로그 대시보드를 Railway(백엔드)와 Vercel(프론트엔드)에 배포하는 방법을 설명합니다.

## 사전 준비

1. [GitHub](https://github.com) 계정
2. [Railway](https://railway.app) 계정 (GitHub 연동)
3. [Vercel](https://vercel.com) 계정 (GitHub 연동)

---

## 1단계: GitHub에 코드 푸시

```bash
# 저장소가 없다면 생성
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vr-log-dashboard.git
git push -u origin main
```

---

## 2단계: Railway 백엔드 배포

### 2.1 프로젝트 생성

1. [Railway](https://railway.app) 접속 후 로그인
2. **"New Project"** 클릭
3. **"Deploy from GitHub repo"** 선택
4. 저장소 선택

### 2.2 PostgreSQL 추가

1. 프로젝트 대시보드에서 **"+ New"** 클릭
2. **"Database"** → **"Add PostgreSQL"** 선택
3. PostgreSQL이 자동으로 프로비저닝됩니다

### 2.3 Redis 추가

1. **"+ New"** 클릭
2. **"Database"** → **"Add Redis"** 선택

### 2.4 백엔드 서비스 설정

1. GitHub 서비스 클릭
2. **Settings** 탭으로 이동
3. **Root Directory**: `backend` 입력
4. **Build Command**: `npm run build`
5. **Start Command**: `npm run start`

### 2.5 환경변수 설정

**Variables** 탭에서 다음 변수 추가:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-key-min-32-chars
CORS_ORIGIN=https://your-app.vercel.app
```

> **참고**: `DATABASE_URL`과 `REDIS_URL`은 Railway가 자동으로 주입합니다.

### 2.6 도메인 설정

1. **Settings** → **Networking** → **Generate Domain**
2. 생성된 URL 복사 (예: `your-backend.up.railway.app`)

---

## 3단계: Vercel 프론트엔드 배포

### 3.1 프로젝트 생성

1. [Vercel](https://vercel.com) 접속 후 로그인
2. **"Add New..."** → **"Project"**
3. GitHub 저장소 Import

### 3.2 프로젝트 설정

```
Framework Preset: Next.js
Root Directory: frontend
Build Command: npm run build
Output Directory: .next
```

### 3.3 환경변수 설정

**Environment Variables** 섹션에서:

```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_WS_URL=wss://your-backend.up.railway.app
```

### 3.4 배포

**Deploy** 버튼 클릭

---

## 4단계: Railway CORS 업데이트

Vercel 배포 완료 후:

1. Railway 프로젝트로 돌아가기
2. **Variables** 탭
3. `CORS_ORIGIN` 값을 Vercel 도메인으로 업데이트:
   ```
   CORS_ORIGIN=https://your-app.vercel.app
   ```
4. 서비스 자동 재배포

---

## 5단계: 데이터베이스 초기화

Railway 서비스에서 마이그레이션이 자동 실행됩니다.
수동 실행이 필요한 경우:

1. Railway 프로젝트 → PostgreSQL 서비스
2. **Data** 탭 → **Query**
3. `database/migrations/001_initial_schema.sql` 내용 실행

---

## 6단계: Unity SDK 설정

VR 앱의 VRLogger 설정:

```csharp
// VRLogger Inspector 설정
Server URL: https://your-backend.up.railway.app
Space ID: (Railway에서 생성된 공간 ID)
```

---

## 배포 확인

### 백엔드 헬스체크
```bash
curl https://your-backend.up.railway.app/api/health
```

예상 응답:
```json
{"success": true, "status": "healthy", "timestamp": "..."}
```

### 프론트엔드 접속
브라우저에서 Vercel URL 접속

---

## 비용 안내

### Railway (월별)
- Starter Plan: $5/월 (500시간 + $5 크레딧)
- PostgreSQL: 사용량에 따라
- Redis: 사용량에 따라
- **예상**: $5-10/월 (3대 VR 기기 기준)

### Vercel
- Hobby Plan: 무료
- **예상**: $0/월

---

## 문제 해결

### 배포 실패
1. Railway Logs 확인
2. Build 로그 확인
3. 환경변수 확인

### 데이터베이스 연결 실패
1. PostgreSQL 서비스 상태 확인
2. DATABASE_URL 변수 확인
3. SSL 설정 확인

### WebSocket 연결 실패
1. CORS_ORIGIN 설정 확인
2. WSS URL 형식 확인 (https → wss)

---

## 업데이트 배포

코드 푸시 시 자동 배포:
```bash
git add .
git commit -m "Update feature"
git push
```

Railway와 Vercel 모두 자동으로 새 버전 배포
