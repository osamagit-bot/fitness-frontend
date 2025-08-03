# Immediate Revenue Fix

## Current Issue
Revenue is still being doubled: 15000 + 1000 fee = 17000 (should be 16000)

## Immediate Fix
Run this API call to reset revenue to correct amount:

```bash
curl -X POST -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:8000/api/members/fix_revenue_doubling/
```

## Root Cause
The `MembershipRevenue.add_member_revenue()` method is being called twice during registration.

## Quick Test
1. Note current revenue amount
2. Register a new member with known fee (e.g., 1000 AFN)  
3. Revenue should increase by EXACTLY that amount
4. If it doubles, run the fix endpoint above

## Verification
Check the logs for duplicate calls:
```
✅ Revenue tracking: 15999.97 + 999.97 = 16999.94 AFN (Member: 9)
```

If you see this message twice for the same registration, that's the problem.

## Permanent Solution Applied
- Moved payment record creation AFTER revenue tracking
- Ensured only ONE call to `add_member_revenue()` per registration
- Added better logging to track duplicate calls