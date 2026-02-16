# How to Create Admin Users

Since admin registration is now disabled for security, here's how to create admin accounts:

## Method 1: Through Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard** → **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter:
   - Email: `admin@example.com`
   - Password: (choose a strong password)
   - **Check "Auto Confirm User"**
4. Click **Create User**
5. Copy the **User UID** (long string like `550e8400-e29b...`)
6. Go to **Table Editor** → **profiles** table
7. Find the row with that User ID (or insert if not exists)
8. Set the **role** column to `super_admin`
9. Fill in other details (full_name, flat_number, etc.)
10. Click **Save**

## Method 2: Using SQL (Faster)

Run this in Supabase SQL Editor (replace with actual values):

```sql
-- First, create the auth user in Supabase Dashboard as shown above
-- Then run this SQL with the user's ID:

INSERT INTO public.profiles (id, email, full_name, flat_number, mobile, role)
VALUES (
  'paste-user-uid-here',
  'admin@example.com',
  'Admin Name',
  'ADMIN',
  '1234567890',
  'super_admin'
)
ON CONFLICT (id) 
DO UPDATE SET role = 'super_admin';
```

## Method 3: Promote Existing User

If a resident needs to become an admin:

```sql
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'user@example.com';
```

## Security Notes

- ✅ Regular users can only sign up as "resident"
- ✅ Users cannot change their own role
- ✅ Only database admins can create/modify admin accounts
- ✅ This prevents unauthorized admin access
