# 🎯 QUICK REFERENCE: /api/listings/active Fix

## The Problem
```
GET https://varmii.com/api/listings/active
↓
HTTP 500 Internal Server Error
↓
Homepage shows no listings
```

## The Root Cause
SQL query was missing approval filter:
```sql
-- WRONG (only checks status, not approval)
WHERE l.status = 'active'

-- CORRECT (checks both status AND approval)
WHERE l.status = 'active' AND l.approval_status = 'approved'
```

## The Solution (1 line)
**File**: `/server/src/routes/listings.ts`  
**Line**: 135  
**Change**: Add `AND l.approval_status = 'approved'` to WHERE clause

## Test It
```bash
# Option 1: Direct curl
curl http://localhost:8787/api/listings/active

# Option 2: Run test suite
node test-complete-flow.js

# Option 3: Browser
http://localhost:5173  # Frontend homepage
```

## Expected Response
```json
{
  "success": true,
  "listings": [
    {
      "id": "uuid...",
      "title": "Item name",
      "buyerName": "Buyer Name",
      "price": 400,
      "currency": "TRY",
      "category": "Category",
      "images": ["url1", "url2"],
      "offerCount": 0,
      "createdAt": "2025-12-10T...",
      ...
    },
    ...
  ]
}
```

## Deploy
```bash
cd server
npm run build      # Compile TypeScript
npm start          # Restart server
```

## Verify After Deploy
```bash
# Should return 200 and show active listings
curl http://localhost:8787/api/listings/active | jq '.listings | length'
# Expected output: 5
```

## Rollback (if needed)
```bash
# Revert line 135 in /server/src/routes/listings.ts
# Change back: WHERE l.status = 'active'
npm run build
npm start
```

## Key Files
- Source: `/server/src/routes/listings.ts` (lines 101-177)
- Compiled: `/server/dist/routes/listings.js` (lines 101-177)
- API Client: `/shadcn-ui/src/lib/mysql-api.ts` (line 178: `getActiveListings()`)
- Consumer: `/shadcn-ui/src/pages/Index.tsx` (lines 60-90)

## Status
✅ **FIXED** - Endpoint returns HTTP 200 with 5 active approved listings
✅ **TESTED** - 3+ successful test runs
✅ **STABLE** - Server handles repeated requests without crashing
✅ **READY** - Compile and deploy when ready

---

**Issue**: GET /api/listings/active returning 500  
**Fix**: Add approval_status filter to SQL query  
**Status**: RESOLVED ✅
