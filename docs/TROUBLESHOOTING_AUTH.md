# Troubleshooting Authentication Issues

## Problem: Getting Logged Out When Clicking Sidebar

### Quick Fixes to Try

**1. Clear Browser Storage**
```
1. Open browser DevTools (F12)
2. Go to Application tab
3. Clear all storage:
   - Local Storage
   - Session Storage
   - Cookies
4. Refresh the page
5. Login again
```

**2. Check Browser Console**
```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors when clicking sidebar
4. Share any error messages
```

**3. Verify Supabase Connection**
```
1. Check .env file has correct credentials
2. Restart dev server: npm run dev
3. Try logging in again
```

### Common Causes

1. **RLS Policy Issues** - Profile table might have restrictive policies
2. **Session Not Persisting** - Browser storage issues
3. **Network Errors** - Supabase connection problems
4. **Profile Missing** - User has no profile in database

### Debug Steps

**Step 1: Check if profile exists**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM profiles WHERE email = 'your@email.com';
```

**Step 2: Check RLS policies**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Step 3: Test with fresh account**
1. Sign up with new email
2. Check if same issue occurs
3. If it works, old account might have data issues

### Manual Fix

If nothing works, manually create/fix your profile:

```sql
-- Replace with your actual user ID and email
INSERT INTO profiles (id, email, full_name, role, vehicle_count, vehicle_numbers)
VALUES (
  'your-user-id-from-auth-users',
  'your@email.com',
  'Your Name',
  'super_admin',  -- or 'resident'
  0,
  '{}'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin';
```

### Still Not Working?

Share these details:
1. Browser console errors
2. Network tab errors (filter by "supabase")
3. What happens step-by-step when you login and click sidebar
