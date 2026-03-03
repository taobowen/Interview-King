# Firebase to Cognito User Data Migration Guide

## Overview
This migration links existing Firebase user data to Cognito authentication without losing your application records.

## What Changed

### Database Schema
- `users.uid` is now **NULLABLE** (was required) - Firebase UIDs remain here for existing users
- New `cognito_sub` field stores your Cognito user ID (the `sub` claim from JWT)
- Both fields are indexed for fast lookups

### Authentication Flow
The system now uses **cognito_sub** as the primary identifier for authentication, as required by Cognito.

## Automatic Migration Process

### Scenario 1: Existing Firebase User Logging In with Cognito
When you log in with Google via Cognito:

1. System gets your `cognito_sub` from JWT token
2. **Checks if already linked** to a user with this `cognito_sub` ✓
3. **If not found, checks by email** (your Google email)
4. **If found by email**: Updates record to link `cognito_sub` WITHOUT modifying `uid`
5. Your application data stays linked via `users.id` (unchanged internal ID)

### Scenario 2: New User
- `uid` = NULL (no Firebase UID)
- `cognito_sub` = your Cognito sub
- Applications data linked via `users.id`

## Migration Data Integrity

✅ **Protected**:
- `users.uid` - NEVER modified after creation
- `users.id` - NEVER changes
- Application records linked to `users.id`

✅ **Automatically Updated**:
- `users.email` - populated if missing
- `users.cognito_sub` - set during first Cognito login

## How to Sync Your Data

### Option 1: Manual Sync (One-time)
```bash
node sync-current-user.js "your-jwt-token"
```

### Option 2: Automatic (Recommended)
- Sign in normally via Cognito
- Sync endpoint called automatically on first login
- Your data will be linked automatically

## Verify Migration Is Complete

1. Sign in with your Cognito account
2. Call `GET /api/me` - should return your user data
3. Access your applications - should show all historical data
4. If any issues, check the `cognito_sub` is set in database

## Troubleshooting

### Issue: "User not found" after logging in

**Solution**: Manually trigger sync:
```javascript
// In browser console
fetch('/api/users/sync', { method: 'POST' })
  .then(r => r.json())
  .then(d => console.log(d))
```

### Issue: Applications show as empty

**Possible causes**:
1. User not synced - run sync endpoint
2. Email mismatch - check if email changed between Firebase and Cognito
3. Multiple accounts - verify you're using same email

**Debug**:
```sql
-- Check if user linked to cognito_sub
SELECT id, uid, cognito_sub, email FROM users WHERE cognito_sub = 'your-cognito-sub';

-- Check if applications exist for this user.id
SELECT COUNT(*) FROM applications WHERE user_id = 'the-user-id';
```

## Database Schema Reference

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NULL,           -- Legacy Firebase UID (NEVER modified)
  cognito_sub VARCHAR(255) UNIQUE NULL,   -- Cognito user ID (from JWT sub claim)
  email VARCHAR(255) UNIQUE NULL,         -- Auto-populated from Cognito
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## API Changes

### Authentication
All endpoints now require JWT token from Cognito (unchanged)

### User Sync Endpoint
```
POST /api/users/sync
Authorization: Bearer <cognito-jwt>

Response:
{
  "user": { id, uid, cognitoSub, email, displayName },
  "synced": true,
  "action": "linked" | "migrated_firebase_to_cognito" | "created_new"
}
```

## Next Steps

1. ✅ Deploy migrations: `npx prisma migrate deploy`
2. ✅ Deploy Lambda functions (handler.js)
3. ✅ Clear any client-side caches
4. ✅ Test login with your Cognito account
5. ✅ Verify applications appear

## Rollback (if needed)

If you need to revert:
1. Keep the schema changes - they're backward compatible
2. Comment out `cognito_sub` logic in handler.js
3. Revert to looking up users by `uid`

However, we recommend testing thoroughly in staging first.
