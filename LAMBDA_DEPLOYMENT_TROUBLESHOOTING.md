# Lambda Deployment Troubleshooting Guide

## Issue: 500 errors on `/api/applications` and `/api/status-events`

### Root Cause Analysis

The Lambda handler now supports two authentication methods:
1. **API Gateway JWT Authorizer Context** (preferred): `event.requestContext.authorizer.jwt.claims`
2. **Authorization Header Fallback** (BFF forwarding): `Authorization: Bearer <JWT>`

### What Changed

**[lambda/auth.js](lambda/auth.js)** now:
- ✅ Checks for JWT claims in API Gateway authorizer context first
- ✅ Falls back to extracting JWT from Authorization header (for BFF requests)
- ✅ Decodes JWT payload without verification (local/BFF scenarios)
- ✅ Provides detailed console logging for auth debugging

### Request Flow

```
Browser → Next.js API (/api/applications + Authorization header)
  ↓
Next.js API Proxy (/app/api/[...path]/route.ts)
  ↓ forwards Authorization header
API Gateway
  ↓ creates Lambda event with headers
Lambda Handler (/lambda/handler.js)
  ↓ extracts JWT from Authorization header
getUserIdentity() (/lambda/auth.js)
  ↓
Handler processes request → queries database → returns response
```

**Important:** Each step must work correctly:
- ✅ Authorization header forwarded by Next.js proxy
- ✅ JWT extracted and decoded successfully
- ✅ User record exists in database
- ✅ Database queries execute without errors

## Diagnostic Checklist

### 1. Verify Lambda Environment Variables in AWS

```bash
# Check if DATABASE_URL is set in Lambda environment
aws lambda get-function-configuration \
  --function-name interview-king-lambda \
  --query 'Environment.Variables'
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://user:password@host:port/database`)

### 2. Check CloudWatch Logs

```bash
# View recent Lambda logs
aws logs tail /aws/lambda/interview-king-lambda --follow
```

**Look for:**
- `PostgreSQL connected successfully` - DB connection working
- `No JWT claims found` - Auth extraction failure
- SQL errors - Database query failures
- Timeout errors - RDS/network issues

### 3. Verify API Gateway Configuration

```bash
# Get API Gateway details
aws apigatewayv2 get-apis
aws apigatewayv2 get-authorizers --api-id <API_ID>
```

**Required Setup:**
- ✅ JWT Authorizer enabled (OR)
- ✅ Authorization header forwarding enabled

### 4. Test Authorization Header Forwarding

```bash
# Get your JWT token first
export JWT_TOKEN="your-cognito-token-here"

# Test direct Lambda invocation with Authorization header
curl -X GET https://interview-king.taobowen.com/api/applications \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
- Status: 200 (with applications array)
- Status: 401 (if JWT invalid or missing user in DB)
- Status: 500 (indicates server error - check CloudWatch logs)

### 5. Verify Database Connection

Run the Lambda `/health` endpoint (no auth required):

```bash
curl -X GET https://interview-king.taobowen.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": {
    "connected": true,
    "version": "PostgreSQL 14.x"
  }
}
```

**If this returns 500:**
- Database connection string is invalid
- RDS is not accessible from Lambda
- VPC configuration issue (Lambda needs access to RDS subnet)

### 6. Local Testing

The Lambda includes a test runner for local validation:

```bash
cd lambda
npm run test:local
```

This tests against your real RDS using `.env` credentials and should show:
- ✅ Database write (POST /users/sync): 200
- ✅ Database read (GET /me): 200  
- ✅ Get applications (GET /applications): 200

### 7. Manual Lambda Testing via AWS CLI

```bash
# Invoke Lambda with test event
aws lambda invoke \
  --function-name interview-king-lambda \
  --payload file://test-event.json \
  response.json

cat response.json
```

Create `test-event.json`:
```json
{
  "version": "2.0",
  "routeKey": "GET /applications",
  "rawPath": "/applications",
  "headers": {
    "authorization": "Bearer YOUR_JWT_TOKEN",
    "content-type": "application/json"
  },
  "requestContext": {
    "http": {
      "method": "GET",
      "path": "/applications"
    },
    "authorizer": {
      "jwt": {
        "claims": {
          "sub": "cognito-user-id",
          "email": "user@example.com",
          "cognito:username": "username"
        }
      }
    }
  }
}
```

## Common Issues & Solutions

### Issue: "JWT claims not found"
**Cause:** Authorization header not forwarded by API Gateway  
**Solution:** 
- Check API Gateway authorizer is enabled
- Verify Next.js API proxy is forwarding headers: `headers.set(key, value)` for all headers
- Add `console.log(event.headers)` to see what headers Lambda receives

### Issue: "User not found" (401)
**Cause:** Cognito user ID doesn't exist in database  
**Solution:**
- First sync the user: `POST /api/users/sync` 
- Verify user was created: Check `users` table in RDS
- Confirm same user ID is being used across requests

### Issue: Database timeout (504)
**Cause:** Lambda can't reach RDS  
**Solution:**
- Check Lambda VPC configuration matches RDS subnet
- Verify security groups allow PostgreSQL port 5432
- Confirm DATABASE_URL uses correct RDS endpoint

### Issue: "Failed to fetch applications" (500)
**Cause:** SQL query execution error  
**Solution:**
- Check CloudWatch logs for specific SQL error
- Verify `applications` table schema matches handler expectations
- Test query directly in psql: `SELECT * FROM applications LIMIT 1;`

## Redeploy Steps

1. Update Lambda code:
```bash
cd lambda
npm run deploy
```

2. Upload to AWS:
```bash
aws lambda update-function-code \
  --function-name interview-king-lambda \
  --zip-file fileb://lambda.zip
```

3. Wait for deployment (30-60 seconds)

4. Test endpoints:
```bash
curl https://interview-king.taobowen.com/api/health
curl https://interview-king.taobowen.com/api/applications \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Still Having Issues?

1. **Check Lambda logs first** - Most diagnostic info is there
2. **Run local test** - `npm run test:local` to isolate issue
3. **Test /health** - Determines if issue is auth or database
4. **Verify DATABASE_URL** - Most common cause of deployment issues

