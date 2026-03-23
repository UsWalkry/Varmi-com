## Copilot instructions for this repo (Varmi.com)

**Architecture Overview**
- **Stack**: React 19 + Vite + shadcn/ui (frontend) → Express + MySQL + Nodemailer (backend) → Flutter mobile app
- **Monorepo Structure**: `shadcn-ui/` (web client), `server/` (API), `varmi_flutter/` (mobile app), root SQL files (schema migrations)
- **Dev Proxy**: Vite proxies `/api` and `/uploads` → backend at `http://localhost:8787` (see `shadcn-ui/vite.config.ts` proxy config)
- **Port Convention**: Backend runs on `8787` (set via `PORT` in `server/.env`); frontend uses port 443 (HTTPS) or 80 (HTTP) based on SSL cert availability at `server/ssl/{key,cert}.pem`
- **Database**: MySQL 5.7+ with UUID primary keys; connection pool in `server/src/database.ts` (10 connections, 60s timeout); uses `utf8mb4` charset for Turkish character support
- **Mobile App**: Flutter 3.2.0+ in `varmi_flutter/`; API base URL in `lib/config/api_config.dart`; JWT token storage key: `mysql-auth-token`

**Frontend Essentials**
- **API Client**: ALWAYS use `mysqlAPI` (`shadcn-ui/src/lib/mysql-api.ts`) for backend calls—never raw `fetch`. It:
  - Auto-adds JWT from localStorage key `mysql-auth-token` to `Authorization` header
  - Clears token and redirects on 401 (except login/register endpoints)
  - Tolerates heterogeneous responses (raw arrays vs `{ success, data }`)
  - Exposes domain helpers: `listings`, `offers`, `favorites`, `notifications`, `orders`, `admin`, `uploadListingImages`
- **Authentication**: `hooks/use-auth-mysql.tsx` fetches user via `mysqlAPI.getCurrentUser()` and is the single source of truth; NEVER read user from localStorage directly
- **Defensive Parsing**: Components (e.g., `pages/Dashboard.tsx`) normalize responses with helpers like `ensureArray` and handle both MySQL data and legacy `DataManager` fallbacks
- **UI Patterns**: Reuse `FavoriteButton`, `CreateListingModal`, `OrderStatusBadge`, `ShippingFormModal`; use `sonner` for toasts (`import { toast } from 'sonner'`)
- **Path Alias**: `@` → `shadcn-ui/src` (configured in `vite.config.ts`)
- **Optional Features**: Source locator plugin (`mgx` prefix, disabled by default for performance) and Sentry plugin (enabled when `VITE_SENTRY_DSN` is set)

**Backend Essentials**
- **Entrypoint**: `server/src/index.ts` loads `.env` from `server/.env`, enables CORS (`origin: true` in dev), serves `/uploads` statically, calls `testConnection()`, mounts routes
- **Route Structure**: All routes under `/api`:
  - `/api/auth` - register, login, 2FA (TOTP/email), email verification, profile updates
  - `/api/listings` - CRUD, image uploads, favorites toggle, view tracking (increments `view_count`)
  - `/api/offers` - create, accept, withdraw, status updates
  - `/api/orders` - lifecycle management (pending → confirmed → preparing → shipped → delivered → completed)
  - `/api/admin` - listing/offer approval, dashboard stats, commission withdrawal management, support tickets (requires `role='admin'`)
  - `/api/comments` - threaded comments on listings with owner reply approval workflow
  - `/api/commission` - user balance, transaction history, withdrawal requests, settings
  - `/api/support` - support ticket system: `POST /contact` creates ticket (saved to DB, auto-email sent)
  - `/api/favorites`, `/api/notifications`, `/api/addresses`, `/api/users`, `/api/setup`
- **Auth Middleware**: `authenticateToken` (in `server/src/middleware/auth.ts`) verifies JWT using `JWT_SECRET`, attaches `req.user = { userId, email }` and `req.userId`; returns 401 if no token, 403 if invalid
- **Optional Auth**: `optionalAuth` middleware allows guest access but attaches user if token present (used in GET endpoints like listing details)
- **Admin Middleware**: `adminOnly` (in `server/src/routes/admin.ts`) requires `authenticateToken` first, then queries `users.role='admin'`; returns 403 if not admin
- **Database Helper**: `query(sql, params)` from `database.ts` wraps `pool.execute()` with error logging; always use parameterized queries to prevent SQL injection
- **Logging Convention**: Use emoji prefixes consistently: 🔍 search, ✅ success, ❌ error, 📧 email, 👁️ view tracking, ❤️ favorites, 🎯 actions, 🔔 notifications
- **Email Service**: `services/emailService.ts` uses nodemailer with pooled SMTP (5 max connections, rate limited 10/sec); config via `SMTP_HOST/PORT/USER/PASS`; automatically creates in-app notifications via `createNotification()` helper
- **Image Uploads**: Multer middleware with 10MB limit (jpeg/jpg/png/webp); saved to `server/uploads/` and served statically at `/uploads`; frontend can also use base64 data URLs

**Database Schema Highlights**
- **users**: `id` (UUID), `email` (UNIQUE), `password_hash`, `firstName`, `lastName`, `city`, `phone`, `gender` (enum), `birth_date`, `address_line1`, `district`, `postal_code`, `role` (user/admin), `email_verified` (boolean), `email_verified_at`, `commission_balance`, `total_commission_earned`, `total_commission_withdrawn`
- **listings**: `id`, `buyer_id` (FK users), `title`, `category`, `listing_condition` (enum: new/like_new/good/fair/poor), `budget_max`, `city`, `delivery_type` (enum: cargo/hand/both), `images` (TEXT, JSON array), `status` (inactive/active/deleted/closed), `approval_status` (pending/approved/rejected), `approved_by` (FK users), `approved_at`, `rejection_reason`, `view_count`, `favorite_count`, `expires_at`, `mask_owner_name` (boolean)
- **listing_approval_audit**: audit trail for listing approvals/rejections/resubmissions (`id`, `listing_id`, `action`, `performed_by`, `reason`, `created_at`)
- **admin_notifications**: `id`, `type` (new_listing/listing_resubmitted/new_offer/offer_resubmitted/other), `title`, `message`, `listing_id`, `offer_id`, `is_read`, `created_at`
- **offers**: `id`, `listing_id` (FK), `seller_id` (FK users), `price`, `status` (inactive/active/accepted/rejected/withdrawn/expired), `approval_status` (pending/approved/rejected), `approved_by`, `approved_at`, `rejection_reason`, `product_name`, `quantity`, `images` (TEXT, JSON array), `delivery_type`, `shipping_desi`, `shipping_cost`, `description`, `valid_until`
- **offer_approval_audit**: audit trail for offer approvals/rejections/resubmissions
- **orders**: `id`, `buyer_id`, `seller_id`, `listing_id`, `source_offer_id`, `status` (pending/confirmed/preparing/shipped/delivered/completed/cancelled), `carrier_company`, `tracking_number`, `started_processing_at`, `shipped_at`, `delivered_at`, `completed_at`
- **order_status_audit**: audit trail for order status changes (`order_id`, `previous_status`, `new_status`, `changed_by`, `change_reason`, `changed_at`)
- **email_verification_tokens**: `token` (VARCHAR), `user_id`, `email`, `expires_at` (used for email verification and email change flows; tokens expire after X hours)
- **user_2fa_settings**: `user_id`, `secret` (TOTP base32), `is_enabled`, `email_2fa_enabled`, `backup_codes` (JSON array), `email_verification_code` (6-digit for email 2FA); authenticator and email 2FA are mutually exclusive
- **favorites**: `user_id`, `listing_id` (composite PK, no id column)
- **listing_comments**: `id`, `listing_id`, `user_id`, `comment`, `parent_comment_id` (self-referencing FK for threaded replies), `is_owner_reply` (boolean), `is_visible` (false until owner replies), `created_at`
- **commission_transactions**: `id`, `user_id`, `order_id`, `transaction_type` (earned/withdrawn), `amount` (DECIMAL 10,2), `description`, `created_at`
- **commission_withdrawal_requests**: `id`, `user_id`, `amount`, `status` (pending/approved/rejected/completed), `bank_name`, `iban`, `account_holder_name`, `admin_notes`, `rejection_reason`, `processed_by`, `processed_at`, `created_at`
- **site_settings**: `id`, `setting_key` (UNIQUE), `setting_value`, `setting_type` (number/text/boolean/json), `description` (stores commission rates and limits)
- **support_tickets**: `id`, `user_id` (nullable FK), `name`, `email`, `phone`, `category`, `subject`, `message`, `status` (open/in_progress/resolved/closed), `priority`, `admin_reply`, `replied_at`, `created_at`

**Approval Workflows** (Critical Business Logic)
1. **Listing Approval**: New listings start with `approval_status='pending'` and `status='inactive'`. Admin must approve (`POST /api/admin/listings/approve/:id`) to make `approval_status='approved'` and `status='active'`. Rejection stores reason, user can resubmit via edit (creates `listing_resubmitted` admin notification). Audit logged in `listing_approval_audit`, admin notified via `admin_notifications`.
2. **Offer Approval**: Similar flow; new/edited offers are `approval_status='pending'` and `status='inactive'`. Admin approves/rejects via `POST /api/admin/offers/:offerId/{approve|reject}`. Approval sets `status='active'`. Audit in `offer_approval_audit`, email notifications sent to seller.
3. **Order Status Flow**: `pending` (buyer creates order) → `confirmed` (buyer confirms) → `preparing` (seller starts work via `POST /api/orders/:id/start-processing`) → `shipped` (seller adds carrier/tracking via `POST /api/orders/:id/shipping`) → `delivered` (buyer confirms via `POST /api/orders/:id/confirm-delivery`) → `completed` (auto-triggers commission calculation). Each transition audited in `order_status_audit`, email sent to both parties. See `ORDER_STATUS_SYSTEM_README.md` for state machine details.
4. **Comment Approval**: Users post comments on listings via `POST /api/comments`, but comments are `is_visible=false` initially. When listing owner replies with `is_owner_reply=true`, both the original comment and reply become `is_visible=true`. Supports threaded replies via `parent_comment_id`. `GET /api/comments/listing/:id` returns only visible comments hierarchically grouped.
5. **Commission System**: When order reaches `completed` status, commissions are automatically calculated and awarded via `commission_transactions`:
   - **Listing owner (buyer)**: receives commission based on `site_settings.buyer_commission_rate` (default 5%) applied to order total
   - **Offer seller**: receives commission based on `site_settings.seller_commission_rate` (default 5%)
   - Exception: Users cannot earn commission on their own listings/offers (buyer_id === seller_id check)
   - Commission is added to `users.commission_balance` and `total_commission_earned`
   - Users can request withdrawals via `POST /api/commission/withdraw` (min 100 TL, max 10,000 TL, configurable in `site_settings`)
   - Admin approves/rejects via `POST /api/admin/commission/withdrawals/:id/{approve|reject}`
   - On approval, amount deducted from balance, marked as withdrawn, `total_commission_withdrawn` incremented
   - See `COMMISSION_SYSTEM_README.md` for detailed business logic and examples

**Developer Workflows**
- **Frontend Dev**: `cd shadcn-ui && pnpm install && pnpm dev` (port 5173 or 443/80 with SSL). Pre-commit checks: `pnpm typecheck && pnpm lint`. Build: `pnpm build` (outputs to `dist/`).
- **Backend Dev**: `cd server && pnpm install && pnpm dev` (port 8787, uses `tsx watch src/index.ts` for hot reload). Copy `.env.example` → `.env` and configure:
  - Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - Auth: `JWT_SECRET` (change from default)
  - Email: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_NAME`, `MAIL_FROM_EMAIL`
  - Optional: `SENTRY_DSN`, `NODE_ENV=development`
- **SSL Development**: Optional HTTPS support; if `server/ssl/key.pem` and `cert.pem` exist, frontend serves on port 443 (HTTPS) instead of 80. Generate certs with `node server/generate-ssl.js` or use `mkcert` for trusted local certs. Frontend Vite proxies to backend with `secure: false` to allow self-signed certs.
- **Health Checks**: 
  - Backend: `GET /health` (returns `{ ok: true }`) and `GET /` (lists available endpoints)
  - Database: `GET /api/setup/test-connection` (requires auth)
- **Database Setup**: Initial schema in `create-all-tables.sql` (544 lines, creates all 20+ tables). Apply manually or use:
  - `node server/check-db.js` - verify DB connection, list users, check table structure
  - `node server/create-missing-tables.js` - create missing tables if not exist
  - `node server/run-update-schema.js` - apply schema updates from root `update_*.sql` files
  - `node server/make-admin.js` - interactive CLI to promote user to admin role
  - `node server/list-users.js` - list all users in database
  - `node server/setup-admin.js` - create initial admin user
- **Testing**: Root contains extensive test utilities:
  - `test-api.js`, `test-admin-api.js`, `test-offers-api.ps1` - API endpoint tests
  - `test-offers.html`, `test-offers-clean.html` - browser-based UI tests
  - `test-mysql-connection.js` - DB connectivity test
  - `start-chrome-no-cors.bat` - launches Chrome with `--disable-web-security` for local CORS testing
- **Debugging**: Server includes many debug utilities in `server/`:
  - `check-*.js` files - verify specific features (orders, comments, offers, listings, users, phones, etc.)
  - `debug-*.js` files - deep dive into specific issues (admin middleware, current state, nested replies, etc.)
  - `fix-*.js` files - one-off scripts to fix data issues (commission, offer status, order status, etc.)
  - All utilities use ES modules and can be run with `node <filename>.js`

**Key Conventions & Gotchas**
- **Token Storage**: Key is `mysql-auth-token` (NOT `auth_token` or `auth-token`); set/clear ONLY via `mysqlAPI.setToken()`, never manually with `localStorage.setItem()`
- **API Response Patterns**: Backend inconsistently returns either `{ success, data }` OR raw arrays/objects. Frontend `mysqlAPI` normalizes both patterns. When writing new endpoints, prefer `{ success: true, data: ... }` for consistency.
- **Response Shape Tolerance**: Components must handle both shapes. Use pattern: `const items = Array.isArray(response) ? response : response.data || []` (see `ensureArray` helper in `Dashboard.tsx`)
- **Optional Auth on GET**: Some endpoints (e.g., `GET /api/listings/:id`) use `optionalAuth` middleware to allow guest access but track views only for authenticated non-owner users. Check `req.user` existence before accessing.
- **2FA Mutual Exclusivity**: Authenticator (TOTP) and Email 2FA cannot both be enabled simultaneously. Enabling one automatically disables the other (enforced in `POST /api/auth/enable-authenticator` and email 2FA endpoints). Stored in separate boolean fields: `is_enabled` and `email_2fa_enabled`.
- **Soft Deletes**: Listings use `status='deleted'` instead of hard deletes (no `DELETE FROM listings`). Queries should always filter by `status != 'deleted'` unless specifically fetching deleted items.
- **UUID Primary Keys**: All main entities (users, listings, offers, orders, etc.) use UUIDs generated with `uuid.v4()` from `uuid` package. Do NOT use auto-increment integers.
- **ES Modules**: Server uses ES modules (`import`/`export`); MUST use `.js` extensions in relative imports even in TypeScript (e.g., `import { query } from './database.js'`). TypeScript compiles to `.js` in `dist/`.
- **UTF-8 Charset**: Server explicitly sets `Content-Type: application/json; charset=utf-8` for all JSON responses via middleware. DB connection uses `charset: 'utf8mb4'` for full Unicode support (emojis, Turkish chars).
- **PowerShell Scripts**: Windows-specific scripts (`.ps1`) available for deployment and database management. Run with `powershell -ExecutionPolicy Bypass -File <script>.ps1`.
- **Sentry Integration**: Optional error tracking for both frontend and backend. Enable by setting `VITE_SENTRY_DSN` (frontend) and `SENTRY_DSN` (backend) in env. Frontend includes source maps upload via `@sentry/vite-plugin` when DSN is set.
- **Dev vs Prod Proxying**: In dev, Vite proxies `/api` and `/uploads` to `http://localhost:8787` (see `vite.config.ts` proxy config). In production, frontend and backend should be served from same domain or configure CORS to restrict `origin` from wildcard `true` to specific domains.
- **CORS Configuration**: Currently allows all origins (`origin: true`) in development. For production, set `FRONTEND_URL` env var and restrict: `origin: process.env.FRONTEND_URL || 'https://varmii.com'`.

**Where to Look First**
- **Client Core**: 
  - `shadcn-ui/src/lib/mysql-api.ts` (975 lines) - API client with domain helpers, auth handling, response normalization
  - `shadcn-ui/src/hooks/use-auth-mysql.tsx` - auth state management hook
  - `shadcn-ui/src/pages/Dashboard.tsx` - main user dashboard showing listings/offers/orders
- **Server Core**: 
  - `server/src/index.ts` (406 lines) - entry point, CORS config, route mounting
  - `server/src/database.ts` - DB connection pool config, `query()` helper
  - `server/src/middleware/auth.ts` - `authenticateToken` and `optionalAuth` middleware
  - `server/src/routes/{auth,listings,offers,orders,admin}.ts` - main API routes
- **Email/Notifications**: 
  - `server/src/services/emailService.ts` (1461 lines) - nodemailer transporter, email templates, notification helpers
- **Database Schema**: 
  - `create-all-tables.sql` (544 lines) - complete schema definition
  - Root `update_*.sql` files - incremental schema migrations
- **Utilities**: 
  - `server/check-db.js` - first stop for DB debugging
  - `server/make-admin.js` - promote user to admin
  - Root `test-*.js` files - API testing examples
- **Documentation**: 
  - `ORDER_STATUS_SYSTEM_README.md` - order lifecycle state machine
  - `LISTING_APPROVAL_SYSTEM_README.md` - listing approval workflow
  - `OFFER_APPROVAL_SYSTEM_README.md` - offer approval workflow
  - `COMMISSION_SYSTEM_README.md` (676 lines) - commission calculation business logic with examples
  - `DEPLOYMENT.md` - deployment setup for cPanel (frontend) and SSH/PM2 (backend)
- **Frontend-specific**: 
  - `shadcn-ui/.github/copilot-instructions.md` - DEPRECATED, contains legacy `DataManager` patterns (localStorage-based mock data) that are being replaced by `mysqlAPI`

**Deployment & CI/CD**
- **GitHub Actions**: Three workflows in `.github/workflows/`:
  - `deploy-frontend.yml` - triggered on push to `main` when `shadcn-ui/**` changes; builds frontend with `pnpm build`, FTPs `dist/` to cPanel `public_html/` using secrets `FTP_SERVER/USERNAME/PASSWORD/FRONTEND_DIR`
  - `deploy-backend.yml` - triggered on push to `main` when `server/**` changes; builds backend with `pnpm build`, tars `dist/` + `node_modules` + `package.json`, rsyncs via SSH to remote server, restarts PM2 process using `ecosystem.config.js`
  - `manual-deploy.yml` - workflow_dispatch for manual deployment of frontend/backend/both
- **Frontend Deployment**: 
  - Build output in `shadcn-ui/dist/` (SPA with `index.html`)
  - FTP upload to cPanel's `public_html/` or subdirectory
  - Vite builds with `base: '/'` (default), configure if serving from subdirectory
  - `.htaccess` may be needed for client-side routing (redirects to `index.html`)
- **Backend Deployment**: 
  - Compiled output in `server/dist/` (ES modules, `.js` files)
  - Rsync'd to remote server directory (e.g., `/home/USER/apps/varmi-mail-server`)
  - PM2 process manager with config in `server/ecosystem.config.js`:
    - App name: `varmi-mail-server`
    - Script: `dist/index.js`
    - Logs: `logs/out.log`, `logs/error.log`
    - Auto-restart on crash (max 10 restarts)
  - Restart command: `pm2 restart ecosystem.config.js --update-env`
- **Required Secrets** (GitHub Actions):
  - Frontend: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_FRONTEND_DIR`
  - Backend: `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`, `BACKEND_REMOTE_DIR`
- **Environment Variables**: 
  - Backend `.env` must be manually created on remote server (NOT in repo, NOT in secrets)
  - Contains sensitive values: DB credentials, JWT secret, SMTP credentials
  - Template in `server/.env.example`
- **CORS Production Config**: 
  - Currently allows all origins (`origin: true`) which is insecure for production
  - Should restrict to frontend domain: `origin: process.env.FRONTEND_URL || 'https://varmii.com'`
  - Set `FRONTEND_URL` env var on production backend server

**Common Pitfalls**
1. **Forgot to run migrations**: New features may require schema updates. Always check root `update_*.sql` files and run `node server/run-update-schema.js` after pulling.
2. **Token not persisting**: Using wrong localStorage key. Must be `mysql-auth-token`, not `auth_token` or custom key.
3. **401 errors after backend restart**: JWT secret changed or not set. Ensure `JWT_SECRET` in `.env` is consistent.
4. **Images not loading**: Check `/uploads` directory permissions and that Vite proxy is running. In production, ensure backend serves `/uploads` statically.
5. **Commission not calculated**: Order must reach `completed` status. Check `order_status_audit` table for state transitions. Also verify `site_settings` has commission rates configured.
6. **Email not sending**: Check `SMTP_*` env vars. If no credentials, backend falls back to `jsonTransport` (logs to console, doesn't actually send). Check `server/src/services/emailService.ts` for transport config.
7. **TypeScript import errors**: Missing `.js` extension in server imports. TypeScript requires explicit `.js` extensions for ES modules even though source files are `.ts`.
8. **CORS errors in production**: Dev allows all origins. Production needs explicit `FRONTEND_URL` whitelist.
9. **MySQL connection timeout**: Default 60s timeout in `database.ts`. For slow queries, increase `connectTimeout` in `dbConfig` or optimize query.
10. **Admin actions failing**: User must have `role='admin'` in `users` table. Use `node server/make-admin.js` to promote a user.

**Performance Notes**
- Frontend source locator plugin (`@metagptx/vite-plugin-source-locator`) is commented out in `vite.config.ts` for performance. Enable only for debugging.
- Backend SMTP uses connection pooling (5 max connections, 100 max messages/connection) to avoid opening new SMTP connections per email.
- Database connection pool configured for 10 concurrent connections. Increase if seeing "too many connections" errors under load.
- Image uploads limited to 10MB to prevent memory issues. Consider CDN (e.g., Google Drive integration exists but needs configuration).

**External Dependencies**
- **Email**: Requires SMTP server (cPanel mail, Gmail, SendGrid, etc.). Config in `server/.env`. Port 465 (SMTPS/SSL) or 587 (STARTTLS).
- **Database**: MySQL 5.7+ or MariaDB 10.3+. Must support `utf8mb4` charset and `JSON` column type.
- **PM2**: Optional for production backend process management. Install globally: `npm i -g pm2`.
- **Flutter**: For mobile app development, requires Flutter SDK 3.2.0+, Dart SDK, Android Studio/Xcode for emulators.
