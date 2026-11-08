# Integration Plan: mediflow‑backend → mediflow (frontend)

---

## 1️⃣ Overview
- **Goal**: Wire the Spring Boot backend (`mediflow‑backend`) to the Angular SSR frontend (`mediflow`).
- **Result**: A single origin (`http://localhost:4000` in dev) serving the UI *and* the REST API under `/api/*`.
- **Key concerns**: authentication (session + CSRF), CORS, RBAC, error handling, and local development workflow.

---

## 2️⃣ Prerequisites
- Docker (for the PostgreSQL DB) – `docker compose up -d db`.
- Java 25 + Maven (backend build).
- Node 20+ + npm (frontend build).
- Environment variables (example in `mediflow/.env.example`):
  ```bash
  BOOTSTRAP_ADMIN_PASSWORD='change‑me‑please-123'  # first‑run admin password
  COOKIE_SECURE=false  # dev only – allow plain‑http cookies
  ```
- (Optional) `GEMINI_API_KEY` if you want the AI copilot.

---

## 3️⃣ Backend Setup
1. `cd mediflow-backend`
2. `mvn clean install` – resolves Spring dependencies.
3. **Database migrations** run automatically via Flyway on startup.
4. Start the API: `mvn spring-boot:run` (defaults to `http://localhost:8080`).
5. Verify endpoints with curl (see `README.md` in the backend).

---

## 4️⃣ Front‑end Setup (Dev Mode)
1. `cd mediflow`
2. `npm install`
3. **Run the Express/SSR server** (which proxies `/api/*` to the backend):
   ```bash
   npm run dev   # uses node to start src/server.ts, port 4000 by default
   ```
4. Open `http://localhost:4000` in a browser – the Angular app will load and all API calls will hit `http://localhost:4000/api/...` which the Express server forwards to `http://localhost:8080/api/...`.

---

## 5️⃣ Authentication & CSRF Flow
| Step | Description |
|------|-------------|
| **GET /api/auth/csrf** | Sets the `XSRF‑TOKEN` cookie (Angular HttpClient reads this automatically). |
| **POST /api/auth/login** | Sends JSON `{username, password}`; on success a session cookie (`SESSION`) is created and the CSRF token rotates. |
| Subsequent calls | Angular automatically adds `X‑XSRF‑TOKEN` header from the cookie. |

The backend’s `SecurityConfig` enforces session concurrency, HSTS, CSP, and sets the `HttpOnly` flag on the session cookie (unless `COOKIE_SECURE=false`).

---

## 6️⃣ RBAC & Permission Mapping
- Permissions are string tokens: `resource:action` (e.g., `order:read`, `batch:create`).
- Backend uses `@PreAuthorize("hasPermission('Order','read')")`.
- Front‑end can expose UI features conditionally by checking the user’s authorities (exposed via `AuthService.login` → `MeResponse`).
- Admin UI (`/api/admin/**`) is protected by `hasPermission('Role','read')` etc.

---

## 7️⃣ API Proxy Configuration (Express)
File: `mediflow/src/server.ts`
```ts
// Register Pharmacy Operations REST API
app.use('/api', apiRouter);
```
- No additional CORS config is needed because the frontend and backend share the same origin (Express proxies). If you separate origins in production, enable CORS in Spring (`CorsConfiguration`) and ensure the Angular `HttpClient` sends `withCredentials: true`.

---

## 8️⃣ Data Model Synchronisation
- Both sides share the *same* domain concepts (Batch, Prescription, Sale, etc.).
- Types are defined twice (Java POJOs in backend, TypeScript interfaces in `src/app/core/models/pharmacy.models.ts`).
- Keep them in sync manually or generate TypeScript types from the Java DTOs using a tool like `jsonschema2pojo` + `typescript-json-schema` if you need stricter contracts.

---

## 9️⃣ Development Workflow
1. **Start DB** → `docker compose up -d db`.
2. **Backend** → `cd mediflow-backend && mvn spring-boot:run`.
3. **Frontend** → `cd mediflow && npm run dev`.
4. Make changes:
   - UI changes → hot‑reload via Angular dev server.
   - API changes → restart backend (or use Spring DevTools for hot reload).
5. Run **integration tests** (e.g., using Testcontainers) to verify auth, lock‑out, and RBAC.

---

## 🔟 Production Considerations
- Build the Angular app: `npm run build` → produces `dist/app`.
- Package the Spring Boot jar (or Docker image) and run behind a reverse proxy (NGINX) that terminates TLS.
- Enable `COOKIE_SECURE=true` and configure `SameSite=Lax` in production.
- Turn on rate‑limiting, MFA, and password‑breach checks (see “Not included yet” in the backend README).

---

## 📚 References
- Backend README – security model, lockout, audit.
- Angular `src/app/core/services/pharmacy-api.ts` – HTTP wrapper.
- `mediflow-backend/src/main/java/com/example/secure/config/SecurityConfig.java` – filter chain.
- `mediflow-backend/src/main/java/com/example/secure/access/AppPermissionEvaluator.java` – permission evaluation.

---

*End of integration plan.*