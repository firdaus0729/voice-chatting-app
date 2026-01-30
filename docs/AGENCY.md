# Agency System

Hierarchical agency with role-based identity, one-time binding, and a flat 2% commission on recharges. **Withdrawals are not enabled.**

## 1. Agency structure

**Roles** (lowest to highest):

- **BD** – default for new signups
- **Admin**
- **Super Admin**
- **Country Manager**
- **Chief Official**

Each user has an **agency profile** (created on first login via `createAgency`): unique **agency code**, role, optional **parent** (inviter), commission balance, team earnings, and timestamps.

## 2. Binding logic

- **Agency code binding**: A user binds to an inviter by entering that inviter’s agency code. Handled by the `bindAgency` Cloud Function.
- **One-time bind**: A user can bind only once. Re-binding is rejected.
- **Abuse prevention**: Self-binding and invalid codes are rejected in Cloud Functions.

## 3. Commission system

- **Flat 2%** commission on each recharge (configurable via `COMMISSION_RATE` in Cloud Functions).
- Commission **flows upward** to the direct parent only (one level per recharge). Implemented in `recordRecharge` (Cloud Functions only).
- **Cloud Functions only**: All commission and balance updates happen server-side. Clients only read agency and commission history.

## 4. Dashboard

- **Agency** screen (entry from Voice Room header):
  - Your profile: role, agency code, parent (if bound).
  - **Team earnings** and **commission balance**.
  - **Withdraw** button: **disabled** (coming soon).
  - **Commission history**: list of commission records (from recharges).
  - **Bind to inviter**: input agency code and bind (only if not already bound).
  - **Assign role** (admin): Chief Official can set another user’s role (target user ID + role).

## 5. Visual identity

- **Official frame**: Role-based colored border around avatar/card (`OfficialFrame`).
- **Role badge**: Compact (e.g. CO, CM, SA, AD, BD) or full label (`AgencyBadge`).
- Shown in **voice room** on seat avatars and on the **Agency** dashboard profile card.

## 6. Security

- **No client writes to agency data**: Firestore rules set `agency` and `agencyCodes` (and commission history subcollection) to **read-only** for clients. All creates/updates are done in Cloud Functions (admin SDK bypasses client rules).
- **Fake hierarchy**: Clients cannot create or change parent/child links; only `bindAgency` (with one-time validation) and server logic do.
- **Admin-only role assignment**: Only users with the **Chief Official** role can call `assignRole` to change another user’s role; enforced in the Cloud Function.

## Testing

1. **Binding**: Create two users; use one’s agency code on the other’s Agency screen to bind. Confirm one-time bind (second bind fails).
2. **Commission**: Trigger `recordRecharge` (e.g. from a backend or test script) with a recharge amount and the recharging user’s ID. Confirm parent’s commission balance and team earnings increase, and a commission history record appears.
3. **Roles**: As Chief Official, use “Assign role” on the Agency screen to set another user’s role; confirm badge/frame in the room and on the dashboard.
4. **APK**: Rebuild the app and verify Agency dashboard, bind flow, and seat avatars with badges/frames.

## Platform admins

The first Chief Officials must be set by **assigning the role in Firestore** (or via a one-off script/Cloud Function) to the intended admin user IDs. After that, those users can use the in-app “Assign role” feature to promote others.
