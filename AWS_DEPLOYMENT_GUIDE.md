# AWS Amplify Deployment Environment Variables

To fix the deployment error and ensure your app works correctly in AWS Amplify, you need to configure these environment variables in your Amplify console.

## Required Environment Variables in AWS Amplify Console

### Firebase Configuration (Public - safe to expose)
```
NEXT_PUBLIC_FB_API_KEY=AIzaSyA4SlE_cvI6Ed-M2tDqDrEfXNKcYhH4NEY
NEXT_PUBLIC_FB_AUTH_DOMAIN=interviewtraker.firebaseapp.com
NEXT_PUBLIC_FB_PROJECT_ID=interviewtraker
NEXT_PUBLIC_FB_STORAGE=interviewtraker.firebasestorage.app
NEXT_PUBLIC_SITE_DOMAIN=interview-king.taobowen.com
NEXT_PUBLIC_FB_STORAGE_BUCKET=interviewtraker.appspot.com
```

### Firebase Admin SDK (Private - keep secret!)
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"interviewtraker","private_key_id":"...your complete service account JSON as single line..."}
```

### Database Configuration (Private - keep secret!)
```
DATABASE_URL=postgresql://username:password@host:port/database?schema=public
```

## How Environment Variables Work in AWS Amplify

1. **Environment Variables** are set in Amplify Console → App Settings → Environment Variables
2. **During Build**: The `amplify.yml` automatically writes these to `.env.production`
3. **At Runtime**: Next.js SSR can read environment variables from `.env.production`

## The `amplify.yml` Configuration

The build configuration in `amplify.yml` automatically:
- Installs dependencies with `npm ci`
- Creates `.env.production` with all required environment variables
- Runs `npm run build` which includes Prisma generation
- Caches build artifacts for faster deployments

## How to Add Environment Variables in AWS Amplify

1. **Open your AWS Amplify Console**
2. **Navigate to your app**
3. **Go to "App Settings" > "Environment Variables"**
4. **Click "Manage variables"**
5. **Add each variable one by one:**
   - Variable name: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Value: Your complete Firebase service account JSON (as a single line string)
   - Click "Add variable"
   - Repeat for `DATABASE_URL` and other variables

## Getting Your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`interviewtraker`)
3. Go to **Project Settings** (gear icon)
4. Navigate to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file
7. **Copy the entire JSON content as a single line** (no line breaks)
8. Use this as the value for `FIREBASE_SERVICE_ACCOUNT_KEY`

## Important Notes

- ⚠️ **Never commit the service account key to Git**
- ⚠️ **The JSON must be on a single line** (no line breaks or formatting)
- ✅ **All NEXT_PUBLIC_* variables are safe to commit** (they're public)
- ✅ **After adding variables, redeploy your app in Amplify**

## After Setting Environment Variables

1. **Trigger a new deployment** in AWS Amplify
2. **Check build logs** to ensure no more environment variable errors
3. **Test your deployed app** to verify Firebase authentication works