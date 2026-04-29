---
name: RLS admin policies must use SECURITY DEFINER function
description: Never use direct subqueries on profiles table inside RLS policies — causes infinite recursion in PostgreSQL
type: feedback
---

Admin RLS policies must use the `is_admin()` SECURITY DEFINER function instead of inline `EXISTS (SELECT 1 FROM profiles WHERE profiles.is_admin = true)`.

**Why:** Inline subqueries on `profiles` inside RLS policies cause infinite recursion because the `profiles` table itself has an admin policy that also queries `profiles`. PostgreSQL detects this and throws `42P17: infinite recursion detected in policy for relation "profiles"`. This silently breaks ALL queries in the app (the JS catch sends users to onboarding screen).

**How to apply:** When adding any new admin-only RLS policy on any table, always use `USING (is_admin())` — never inline the profiles subquery. The `is_admin()` function already exists as SECURITY DEFINER and bypasses RLS.
