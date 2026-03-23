## Copilot instructions for this repo (Varmi.com)

**Architecture Overview**
- **Stack**: React 19 + Vite + shadcn/ui (frontend) → Express + MySQL + Nodemailer (backend) → Flutter mobile app
- **Monorepo Structure**: `shadcn-ui/` (web client), `server/` (API), `varmi_flutter/` (mobile app), root SQL files (schema migrations)
- **Dev Proxy**: Vite proxies `/api` and `/uploads` → `http://localhost:8787` (see `shadcn-ui/vite.config.ts`)
- **Port Convention**: Server runs on `8787` (set via `PORT` in `server/.env`); frontend defaults to port 443 with SSL or 80 without
- **Database**: MySQL with UUID primary keys; connection pool configured in `server/src/database.ts`; uses `utf8mb4` charset
- **Mobile App**: Flutter 3.2.0+ in `varmi_flutter/`; API base URL in `lib/config/api_config.dart`; token storage key: `mysql-auth-token`

**Frontend Essentials**
- **API Client**: ALWAYS use `mysqlAPI` (`shadcn-ui/src/lib/mysql-api.ts`) for backend calls—never raw `fetch`. It:
  - Auto-adds JWT from localStorage key `mysql-auth-token` to `Authorization` header
  - Clears token and redirects on 401 (except login/register endpoints)
  - Tolerates heterogeneous responses (raw arrays vs `{ success, data }`)
  - Exposes domain helpers: `listings`, `offers`, `favorites`, `notifications`, `orders`, `admin`, `uploadListingImages`
- **Authentication**: `hooks/use-auth-mysql.tsx` fetches user via `mysqlAPI.getCurrentUser()` and is the single source of truth; NEVER read user from localStorage directly
- **Defensive Parsing**: Components (e.g., `pages/Dashboard.tsx`) normalize responses with helpers like `ensureArray` and handle both MySQL data and legacy `DataManager` fallbacks
- **UI Patterns**: Reuse `FavoriteButton`, `CreateListingModal`, `OrderStatusBadge`, `ShippingFormModal`; use `sonner` for toasts (import `{ toast } from 'sonner'`)
- **Path Alias**: `@` → `shadcn-ui/src` (configured in `vite.config.ts`)
- **Optional Features**: Source locator plugin (`mgx` prefix) and Sentry plugin (enabled when `VITE_SENTRY_DSN` is set)

**Backend Essentials**
- **Entrypoint**: `server/src/index.ts` loads `.env`, enables CORS, serves `/uploads` statically, calls `testConnection()`, mounts routes
- **Route Structure**: All routes under `/api`:
  - `/api/auth` - register, login, 2FA, email verification, profile updates
  - `/api/listings` - CRUD, image uploads, favorites toggle, view tracking
  - `/api/offers` - create, accept, withdraw, status updates
  - `/api/orders` - lifecycle management (pending → confirmed → preparing → shipped → delivered → completed)
  - `/api/admin` - listing/offer approval, dashboard stats, commission withdrawal management, support tickets (requires `role='admin'`)
  - `/api/comments` - threaded comments on listings with owner reply approval workflow
  - `/api/commission` - user balance, transaction history, withdrawal requests, settings
  - `/api/support` - support ticket system: `POST /contact` creates ticket (saved to DB, auto-email sent)
  - `/api/favorites`, `/api/notifications`, `/api/addresses`, `/api/users`, `/api/setup`
- **Auth Middleware**: `authenticateToken` (in `server/src/middleware/auth.ts`) verifies JWT, attaches `req.user = { userId, email }` and `req.userId`
- **Admin Middleware**: `adminOnly` (in `server/src/routes/admin.ts`) requires `authenticateToken` first, then checks `users.role='admin'`
- **Database Helper**: `query(sql, params)` from `database.ts` wraps `pool.execute()` with error logging
- **Logging Convention**: Use emoji prefixes: 🔍 search, ✅ success, ❌ error, 📧 email, 👁️ view tracking, ❤️ favorites, 🎯 actions
- **Email Service**: `services/emailService.ts` uses nodemailer with pooled SMTP; falls back to `jsonTransport` in dev if no credentials
- **Image Uploads**: Multer middleware with 5MB limit (jpeg/jpg/png/webp); saved to `uploads/` and served statically; Google Drive fallback available

**Database Schema Highlights**
- **users**: `id` (UUID), `email`, `password_hash`, `firstName`, `lastName`, `city`, `phone`, `gender`, `birth_date`, `address_line1`, `district`, `postal_code`, `role` (user/admin), `email_verified`, `email_verified_at`
- **listings**: `id`, `buyer_id` (FK users), `title`, `category`, `listing_condition`, `budget_max`, `city`, `delivery_type`, `images` (JSON array), `status` (active/inactive/deleted/closed), `approval_status` (pending/approved/rejected), `approved_by`, `approved_at`, `rejection_reason`, `view_count`, `favorite_count`, `expires_at`, `mask_owner_name`
- **listing_approval_audit**: audit trail for listing approvals/rejections/resubmissions (`id`, `listing_id`, `action`, `performed_by`, `reason`, `created_at`)
- **admin_notifications**: `id`, `type` (new_listing/listing_resubmitted/new_offer/offer_resubmitted/other), `title`, `message`, `listing_id`, `offer_id`, `is_read`, `created_at`
- **offers**: `id`, `listing_id`, `seller_id`, `amount`, `status` (active/accepted/rejected/withdrawn), `approval_status` (pending/approved/rejected), `approved_by`, `approved_at`, `rejection_reason`, `product_name`, `quantity`, `images` (JSON), `delivery_type`, `shipping_desi`, `shipping_cost`, `description`, `valid_until`
- **offer_approval_audit**: audit trail for offer approvals/rejections/resubmissions
- **orders**: `id`, `buyer_id`, `seller_id`, `listing_id`, `source_offer_id`, `status` (pending/confirmed/preparing/shipped/delivered/completed/cancelled), `carrier_company`, `tracking_number`, `started_processing_at`, `shipped_at`, `delivered_at`, `completed_at`
- **order_status_audit**: audit trail for order status changes (`order_id`, `previous_status`, `new_status`, `changed_by`, `change_reason`, `changed_at`)
- **email_verification_tokens**: `token`, `user_id`, `email`, `expires_at` (used for email verification and email change flows)
- **user_2fa_settings**: `user_id`, `secret` (TOTP authenticator), `is_enabled`, `email_2fa_enabled`, `backup_codes` (JSON), `email_verification_code` (mutual exclusive: authenticator OR email 2FA)
- **favorites**: `user_id`, `listing_id` (composite PK)
- **listing_comments**: `id`, `listing_id`, `user_id`, `comment`, `parent_comment_id` (for threaded replies), `is_owner_reply` (boolean), `is_visible` (false until owner replies), `created_at` (threaded comment system with approval workflow)
- **commission_transactions**: `id`, `user_id`, `order_id`, `transaction_type` (earned/withdrawn), `amount`, `description`, `created_at` (tracks commission earnings and withdrawals)
- **commission_withdrawal_requests**: `id`, `user_id`, `amount`, `status` (pending/approved/rejected/completed), `bank_name`, `iban`, `account_holder_name`, `admin_notes`, `created_at` (user withdrawal requests)
- **commission_settings**: `id`, `buyer_commission_rate`, `seller_commission_rate`, `min_withdrawal_amount`, `max_withdrawal_amount` (configurable by admin; default: 5% each, 100-10000 TL limits)
- **support_tickets**: `id`, `user_id` (nullable FK), `name`, `email`, `phone`, `category`, `subject`, `message`, `status` (open/in_progress/resolved/closed), `priority`, `admin_reply`, `replied_at`, `created_at`

**Approval Workflows** (Critical Business Logic)
1. **Listing Approval**: New listings start with `approval_status='pending'` and `status='inactive'`. Admin must approve (`/api/admin/listings/approve/:id`) to make `approval_status='approved'` and `status='active'`. Rejection stores reason, user can resubmit via edit. Audit logged in `listing_approval_audit`, admin notified via `admin_notifications`.
2. **Offer Approval**: Similar flow; new/edited offers are `approval_status='pending'`. Admin approves/rejects via `/api/admin/offers/:offerId/{approve|reject}`. Audit in `offer_approval_audit`, email notifications sent.
3. **Order Status Flow**: pending → confirmed → preparing (seller starts processing) → shipped (seller adds carrier/tracking) → delivered (buyer confirms) → completed. Each transition audited in `order_status_audit`, email sent to both parties. See `ORDER_STATUS_SYSTEM_README.md` for details.
4. **Comment Approval**: Users post comments on listings, but comments are `is_visible=false` until listing owner replies. Once owner replies with `is_owner_reply=true`, both comments become visible. Supports threaded replies via `parent_comment_id` (self-referencing FK). GET `/api/comments/listing/:id` returns only visible comments hierarchically grouped.
5. **Commission System**: When order reaches `completed` status, commissions are automatically calculated and awarded:
   - **Listing owner (buyer)**: receives commission based on `buyer_commission_rate` (default 5%)
   - **Offer seller**: receives commission based on `seller_commission_rate` (default 5%)
   - Exception: Users cannot earn commission on their own listings/offers
   - Users can request withdrawals via `/api/commission/withdraw` (min 100 TL, max 10,000 TL)
   - Admin approves/rejects via `/api/admin/commission/withdrawals/:id/{approve|reject}`
   - See `COMMISSION_SYSTEM_README.md` for detailed business logic and examples

**Developer Workflows**
- **Frontend Dev**: `cd shadcn-ui; pnpm install; pnpm dev` (port 5173). Pre-commit: `pnpm typecheck && pnpm lint`. Build: `pnpm build`.
- **Backend Dev**: `cd server; pnpm install; pnpm dev` (port 8787, tsx watch mode). Copy `.env.example` → `.env` and set `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME`, SMTP credentials, `JWT_SECRET`, optionally `SENTRY_DSN`.
- **SSL Development**: Optional HTTPS support; auto-loads `server/ssl/{key,cert}.pem` if present. Generate with `node generate-ssl.js` or use `mkcert`. Frontend Vite proxies to `https://localhost:8787` with `secure: false` for self-signed certs.
- **Health Check**: `GET /health` (backend status), `GET /` (lists available endpoints)
- **DB Migration**: Run root SQL files (`create_*.sql`, `update_*.sql`) manually or use utility scripts in `server/`:
  - `node check-db.js` - verify DB connection and table structure
  - `node create-missing-tables.js` - create tables if they don't exist
  - `node run-update-schema.js` - apply schema updates
  - `node make-admin.js` - promote user to admin role (interactive)
  - `node list-users.js` - list all users
  - `node setup-admin.js` - initial admin setup
- **Testing**: Root contains test utilities (`test-*.js`, `test-*.cjs`, `test-*.html`); `start-chrome-no-cors.bat` launches Chrome with CORS disabled for local testing
- **Debugging**: Server includes many debug utilities (`debug-*.js`, `check-*.js`) for troubleshooting specific issues

**Key Conventions & Gotchas**
- **Token Storage**: Key is `mysql-auth-token` (NOT `auth_token`); set/clear ONLY via `mysqlAPI.setToken()`, never manually
- **API Calls**: Prefer `mysqlAPI` domain helpers over raw fetch. Exception: some legacy test code in `Dashboard.tsx` uses direct fetch—don't copy that pattern
- **Response Shape Tolerance**: Backend may return `{ success, data }` OR raw arrays; frontend must normalize both (see `ensureArray` pattern in Dashboard)
- **Optional Auth on GET**: Some endpoints (e.g., `GET /listings/:id`) allow guest access but track views only for authenticated users who aren't the owner
- **2FA Mutual Exclusivity**: Authenticator and Email 2FA cannot both be enabled; enabling one auto-disables the other (enforced in `routes/auth.ts`)
- **Soft Deletes**: Listings use `status='deleted'` instead of hard deletes; queries should filter by status
- **UUID Primary Keys**: All main entities (users, listings, offers, orders) use UUIDs generated with `uuid.v4()`
- **ES Modules**: Server uses ES modules (`import`/`export`); MUST use `.js` extensions in imports (TypeScript compiles to `.js`)
- **UTF-8 Charset**: Server sets `Content-Type: application/json; charset=utf-8` for all JSON responses; DB connection uses `charset: 'utf8mb4'`
- **PowerShell Scripts**: Windows-specific scripts (`.ps1`) available for deployment and setup tasks
- **Sentry Integration**: Optional error tracking enabled when `SENTRY_DSN`/`VITE_SENTRY_DSN` is set; includes source maps upload in builds
- **Dev vs Prod Proxying**: In dev, Vite proxies `/api` and `/uploads` to backend (see `vite.config.ts`); in production, both served from same domain or CORS configured

**Where to Look First**
- **Client Core**: `shadcn-ui/src/lib/mysql-api.ts`, `src/hooks/use-auth-mysql.tsx`, `src/pages/Dashboard.tsx`
- **Server Core**: `server/src/index.ts`, `src/database.ts`, `src/middleware/auth.ts`, `src/routes/{auth,listings,offers,orders,admin}.ts`
- **Email/Notifications**: `server/src/services/emailService.ts`
- **Utilities**: `server/*.js` (check-db, make-admin, etc.), root `test-*` files
- **Documentation**: `ORDER_STATUS_SYSTEM_README.md`, `LISTING_APPROVAL_SYSTEM_README.md`, `OFFER_APPROVAL_SYSTEM_README.md`, `COMMISSION_SYSTEM_README.md`, `DEPLOYMENT.md`
- **Frontend-specific**: `shadcn-ui/.github/copilot-instructions.md` has legacy DataManager patterns (localStorage-based mock data) that are being replaced by `mysqlAPI`

**Deployment & CI/CD**
- **GitHub Actions**: `.github/workflows/{deploy-frontend,deploy-backend,manual-deploy}.yml`
- **Frontend**: Build in CI, FTP to cPanel `public_html/` (see `DEPLOYMENT.md`)
- **Backend**: Build in CI, rsync via SSH to remote server, PM2 restart (config in `server/ecosystem.config.js`)
- **Secrets Required**: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `BACKEND_REMOTE_DIR`
- **Environment**: Backend `.env` must be manually created on remote server (NOT in repo)
- **CORS**: Development allows all origins (`origin: true`); production should restrict to `process.env.FRONTEND_URL`
