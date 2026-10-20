-- 0038_purchase_revoked.sql
--
-- Lets an admin take back access that was already granted.
--
-- Until now an approved purchase was final: `PurchaseActions` only offered a
-- decision on `requested` rows, and nothing could undo an approval. Revoking
-- is its own status rather than a reuse of `denied`, because the two record
-- different histories — a denied request was never honoured, while a revoked
-- one was approved (and usually paid for) first. An admin reconciling a bank
-- statement against `readable_id` needs to tell those apart.
--
-- Nothing else has to change for access to end: every gate (RLS on `modules`,
-- `assertCourseAccess`, `checkModulePageAccess`) tests `status = 'approved'`,
-- so a revoked row simply stops matching. The unique index from 0009 covers
-- only `requested` and `approved`, so a revoked row — like a denied one — does
-- not block a later request.
--
-- Only ADD VALUE statements here, for the reason given in 0015: a new enum
-- value cannot be used in the transaction that added it.

alter type public.purchase_status add value if not exists 'revoked';

alter type public.notification_type add value if not exists 'purchase_revoked';
