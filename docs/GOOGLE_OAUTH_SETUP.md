# Google OAuth Setup Guide

Follow these steps to enable Google Sign-In for your RWA application.

## Step 1: Enable Google Provider in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list
4. Toggle it **ON**
5. You'll see fields for:
   - **Client ID**
   - **Client Secret**

Keep this page open - we'll fill these in after creating a Google OAuth app.

## Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: `RWA Management System`
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue**
   - Skip Scopes (click **Save and Continue**)
   - Add test users if needed
   - Click **Save and Continue**

6. Back to Create OAuth Client ID:
   - Application type: **Web application**
   - Name: `RWA Web App`
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (for development)
     - Your production URL (e.g., `https://yourdomain.com`)
   - **Authorized redirect URIs**:
     - `https://your-project-ref.supabase.co/auth/v1/callback`
     - (Get this exact URL from Supabase → Authentication → Providers → Google → "Callback URL")
   
7. Click **CREATE**
8. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Supabase

1. Go back to **Supabase Dashboard** → **Authentication** → **Providers** → **Google**
2. Paste the **Client ID**
3. Paste the **Client Secret**
4. Click **Save**

## Step 4: Test Google Sign-In

1. Run your app: `npm run dev`
2. Go to `/signup` or `/login`
3. Click **"Sign up with Google"** or **"Sign in with Google"**
4. You should be redirected to Google's login page
5. After signing in, you'll be redirected back to your app

## Step 5: Handle First-Time Google Users

When a user signs in with Google for the first time, Supabase creates an auth user but **NOT** a profile. You need to handle this:

### Option 1: Create Profile Automatically (Recommended)

Create a Supabase Database Function (trigger) to auto-create profiles:

\`\`\`sql
-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'resident'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run function on new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
\`\`\`

Run this SQL in **Supabase SQL Editor**.

### Option 2: Profile Completion Page

Redirect Google users to a profile completion page if their profile doesn't exist. (More complex, requires additional UI)

## Troubleshooting

### Error: "redirect_uri_mismatch"
- Make sure the redirect URI in Google Console **exactly matches** the callback URL from Supabase
- Include `https://` and don't add trailing slashes

### Error: "Access blocked: This app's request is invalid"
- Configure the OAuth consent screen in Google Cloud Console
- Add your email as a test user

### User signs in but gets "No profile found"
- Implement the database trigger (Option 1 above)
- Or manually create a profile in Supabase Table Editor

## Production Checklist

- [ ] Add production domain to Google OAuth authorized origins
- [ ] Add production callback URL to Google OAuth redirect URIs
- [ ] Verify OAuth consent screen is properly configured
- [ ] Test sign-in flow in production
- [ ] Ensure database trigger creates profiles automatically

## Step 6: Customizing the Login Display Name (e.g., "RWA Pocker 19")

To change the name users see when they sign in with Google:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **OAuth consent screen**
3. Click **EDIT APP** (or "Edit" if you've already created it)
4. Update the **App name** field to `RWA Pocker 19`
5. Click **Save and Continue** until you reach the end.

> [!NOTE]
> Changes to the App name may take a few minutes to several hours to propagate across Google's servers.

## Security Notes
- ✅ Google OAuth is more secure than password-based auth
- ✅ Users don't need to remember passwords
- ✅ 2FA is handled by Google
- ⚠️ All Google users will be created as "resident" role by default
- ⚠️ Users will be forced to complete their profile (Phone, Flat #, Vehicles) on first login.
