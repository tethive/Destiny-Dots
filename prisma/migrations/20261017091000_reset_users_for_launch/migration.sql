-- Clear out pre-launch accounts, keeping only admins.
--
-- Deleting a user cascades to their orders and invoices, so every billing row
-- is archived as JSON first: invoices are financial records and must survive
-- the account they belonged to.

CREATE TABLE IF NOT EXISTS "ArchivedBilling" (
  "id"         TEXT PRIMARY KEY,
  "kind"       TEXT NOT NULL,
  "userEmail"  TEXT,
  "data"       JSONB NOT NULL,
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

INSERT INTO "ArchivedBilling" ("id", "kind", "userEmail", "data")
SELECT gen_random_uuid()::text, 'invoice', u."email", to_jsonb(i)
FROM "Invoice" i
JOIN "user" u ON u."id" = i."userId"
WHERE coalesce(u."role", 'student') <> 'admin';

INSERT INTO "ArchivedBilling" ("id", "kind", "userEmail", "data")
SELECT gen_random_uuid()::text, 'order', u."email", to_jsonb(o)
FROM "Order" o
JOIN "user" u ON u."id" = o."userId"
WHERE coalesce(u."role", 'student') <> 'admin';

-- Marketplace purchases hold a Restrict reference to the project, so they go
-- before the seller's projects are cascaded away.
DELETE FROM "ProjectDispute" WHERE "purchaseId" IN (
  SELECT pp."id" FROM "ProjectPurchase" pp
  LEFT JOIN "Project" pr ON pr."id" = pp."projectId"
  WHERE pp."buyerId" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin') OR pr."sellerId" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin')
);

DELETE FROM "ProjectPurchase" WHERE "buyerId" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin')
  OR "projectId" IN (SELECT "id" FROM "Project" WHERE "sellerId" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin'));

DELETE FROM "ProjectReview" WHERE "buyerId" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin')
  OR "projectId" IN (SELECT "id" FROM "Project" WHERE "sellerId" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin'));

DELETE FROM "Project" WHERE "sellerId" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin');

DELETE FROM "user" WHERE "id" IN (SELECT "id" FROM "user" WHERE coalesce("role", 'student') <> 'admin');
