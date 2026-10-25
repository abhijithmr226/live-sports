# CloudCast Sports Studio 🏟️

**CloudCast Sports Studio** is a production-grade sports live-streaming management and cloud relay platform. It enables broadcasters and sports operators to take authorized live HLS/M3U8 video feeds, relay them persistently via cloud-hosted FFmpeg workers to YouTube Live (or any RTMP/RTMPS destination), schedule broadcasts across timezones, monitor stream telemetry in real time, and manage sports fixtures.

---

## ⚡ Core Operational Capabilities

- **Browser-Independent Cloud Relaying:** Relays continue uninterrupted if the operator closes their browser, logs out, or turns off their local PC.
- **Genuine FFmpeg 9.0+ Worker Engine:** Spawns safe parameter arrays directly (no shell injection vulnerabilities), demuxes HLS playlists, copies compatible codecs directly or transcodes to H.264/AAC.
- **SSRF Defense Guard:** Automatically checks input URLs against DNS resolution and strictly prohibits private/loopback/link-local IP addresses (127.0.0.1, 10.x, 192.168.x, 169.254.169.254 metadata services).
- **Server-Side FFprobe Validation:** Probes remote streams on creation, detecting format, video/audio codecs, resolution, and frame rates.
- **AES-256-GCM Secret Protection:** RTMP stream keys are encrypted with 96-bit initialization vectors and authenticated tags. Private keys are masked (`••••••••••••8842`) and never returned to client browsers.
- **Durable Timezone-Aware Scheduler:** Persists broadcast schedules with daily or weekday recurrence and distributed execution locks. Interrupted jobs are automatically reconciled and logged upon worker restart.
- **Real-Time Telemetry & SSE:** Live bitrates, frame rates (FPS), dropped frames, and FFmpeg console events streamed via Server-Sent Events.
- **Sports Match & Fixture Management:** Organize competitions, home vs away teams, venues, kickoff times, and linked camera feeds.
- **Public Watch Arena:** Sanitized public watch page for fans with a responsive video player and scoreboard banner without leaking private ingest URLs or stream keys.

---

## 🏗️ Repository Architecture

```
footbal/
├── shared/              # Shared TypeScript interfaces, DTOs, and Zod schemas
│   ├── src/types.ts
│   ├── src/validation.ts
│   └── package.json
├── backend/             # REST API, SQLite/PostgreSQL persistence, SSRF guard, FFmpeg supervisor
│   ├── src/config.ts
│   ├── src/db/index.ts
│   ├── src/security/    # AES-256-GCM encryption, secret redaction, SSRF validator
│   ├── src/services/    # FFprobe probe service, streamingEngine, durableScheduler
│   ├── src/routes/      # auth, streams, destinations, schedules, events, analytics, logs, publicWatch
│   ├── src/__tests__/   # Automated unit test suite (15 tests)
│   └── Dockerfile
├── worker/              # Standalone cloud streaming worker process
│   ├── src/index.ts
│   └── Dockerfile
├── frontend/            # Next.js 16 App Router dashboard with Tailwind CSS & Lucide icons
│   ├── src/app/
│   │   ├── page.tsx               # Overview Broadcast Operations Center
│   │   ├── streams/page.tsx       # Live Channels & Filters
│   │   ├── streams/create/        # 6-Step Stream Creation Wizard with FFprobe test
│   │   ├── streams/[id]/          # Flagship Stream Control Room & Real-time Console
│   │   ├── schedule/page.tsx      # Durable Automated Scheduler
│   │   ├── events/page.tsx        # Sports Match & Fixture Management
│   │   ├── destinations/page.tsx  # YouTube Live & RTMP Endpoints
│   │   ├── analytics/page.tsx     # Telemetry Analytics & CSV Export
│   │   ├── logs/page.tsx          # Real-Time Event & Security Audit Logs
│   │   ├── settings/page.tsx      # Worker Configuration & YouTube Walkthrough
│   │   ├── account/page.tsx       # Operator Security & Password Management
│   │   └── watch/[id]/page.tsx    # Secure Public Watch Arena
│   └── Dockerfile
├── docker-compose.yml   # Multi-container production stack (PostgreSQL, Redis, Worker, Backend, Frontend)
├── .env.example         # Environment variables template
└── package.json         # Monorepo workspaces configuration
```

---

## 🚀 Local Development on Windows 11

### Prerequisites
- **Node.js LTS** (v20+ or v24+)
- **FFmpeg & FFprobe** installed and accessible on your Windows PATH (verify with `ffmpeg -version`)
- **Git for Windows**

### Quick Start (Zero-Configuration Local SQLite Mode)

1. **Clone and Install Dependencies:**
   ```powershell
   cd c:\Users\Krynn\Documents\footbal
   npm install
   ```

2. **Configure Environment Variables:**
   ```powershell
   Copy-Item .env.example .env
   ```

3. **Build Packages:**
   ```powershell
   npm run build
   ```

4. **Run Automated Test Suite:**
   ```powershell
   npm test
   ```

5. **Start Development Servers:**
   ```powershell
   # In terminal 1 (Backend API on port 4000):
   npm run dev:backend

   # In terminal 2 (Next.js Dashboard on port 3000):
   npm run dev:frontend
   ```

6. **Open Dashboard:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

   **Default Admin Credentials:**
   - **Email:** `admin@cloudcast.studio`
   - **Password:** `admin123456`

---

## 📺 YouTube Live Setup Instructions

1. **Enable Live Streaming on YouTube:**
   - Navigate to [YouTube Studio](https://studio.youtube.com).
   - Click **Create** > **Go Live**.
   - If not previously enabled, complete phone verification. (YouTube requires a one-time 24-hour activation).

2. **Create a Stream in YouTube Live Control Room:**
   - Select the **Stream** tab (Streaming software option).
   - Set broadcast privacy to **Unlisted** for pre-broadcast rehearsal.
   - Note the **Stream URL**: `rtmp://a.rtmp.youtube.com/live2`
   - Copy your **Stream Key**.

3. **Configure in CloudCast:**
   - Open CloudCast Dashboard > **Destinations** > **Add Destination**.
   - Select **YouTube Live**.
   - Paste the Stream Key. CloudCast will encrypt it using AES-256-GCM.
   - Click **Save Destination**.

4. **Start the Broadcast:**
   - Go to **Create Stream** or select a configured channel.
   - Click **Go Live (Start Relay)**.
   - CloudCast will spawn FFmpeg in the background. Within 5–10 seconds, YouTube Studio will display **"Excellent Connection"** with live video and audio.
   - Click **Go Live** inside YouTube Studio when you are ready to broadcast to viewers.

---

## 🐳 Production Deployment with Docker Compose

For containerized cloud deployments with PostgreSQL and Redis:

```bash
# 1. Generate strong production secrets:
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# 2. Start all services:
docker compose up -d --build
```

Services exposed:
- Frontend Dashboard: `http://localhost:3000`
- Backend REST API: `http://localhost:4000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

---

## 🛡️ Production Security Checklist

- [x] **SSRF Protection:** Resolves hostnames via DNS and blocks loopback, private ranges, and metadata IPs (169.254.169.254).
- [x] **Command Injection Prevention:** Spawns child processes using parameter arrays (`spawn("ffmpeg", [...])`) with zero shell interpolation.
- [x] **Envelope Encryption:** Stream keys encrypted at rest using AES-256-GCM.
- [x] **Masked Keys in UI:** Raw keys are never sent in API responses (`••••••••••••8842`).
- [x] **Sanitized Logging:** RTMP stream keys, bearer tokens, and URL authentication parameters are redacted before writing to disk logs.
- [x] **Public Watch Isolation:** Public watch routes NEVER expose internal source URLs or destination keys.
- [x] **Authentication:** All control endpoints protected by JWT Bearer tokens and role-based checks.

---

## ⚠️ Free-Tier Cloud Hosting Limitations

- **Frontend:** Can be hosted 100% free on Vercel, Netlify, or Cloudflare Pages.
- **Backend API & PostgreSQL:** Free on Supabase, Neon, or Render.
- **Streaming Worker (FFmpeg):** **Cannot run on serverless functions** (Vercel, AWS Lambda) due to execution time limits (15–60 seconds) and high outbound bandwidth demands. Continuous streaming requires an always-on VPS (e.g. Hetzner, DigitalOcean, or an on-premise Windows/Linux machine).

---

## 🧪 Automated Testing

Run the automated test suite verifying SSRF defense, AES-256-GCM encryption, log redaction, and database integrity:

```powershell
npm test
```
Result: **15 tests passing, 0 failing.**
