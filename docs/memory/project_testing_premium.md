---
name: Testing phase - all users premium
description: During testing phase all users are set as premium in DB. Must reset non-paying users and deploy group premium logic when launching official version.
type: project
---

All users were set as `is_premium = true` in Supabase for testing phase (2026-04-09).

**Why:** User wants testers to have full access during internal testing to collect feedback before official launch.

**How to apply:** When launching the official version:
1. Reset non-paying users: `UPDATE profiles SET is_premium = false, subscription_status = 'free', subscription_plan = null WHERE subscription_plan = 'lifetime' AND billing_provider IS NULL;`
2. Build and upload new AAB with the group premium logic (code already in place - premium shared across all baby group members)
3. Bump versionCode (currently at 8 in build.gradle but not yet uploaded)
