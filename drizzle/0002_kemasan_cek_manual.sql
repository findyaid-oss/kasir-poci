-- Kemasan (cup & lunch box) cukup dicek manual (Masih banyak / Setengah / Habis), tidak dihitung per buah.
UPDATE "ingredients" SET "tracking" = 'manual', "group" = 'Cek manual', "check_status" = COALESCE("check_status", 'aman') WHERE "name" IN ('Cup 16 oz', 'Cup plastik kecil', 'Lunch box L');--> statement-breakpoint
-- Kemasan baru: Cup 18 oz (cek manual)
INSERT INTO "ingredients" ("name", "group", "unit", "tracking", "low_threshold", "check_status", "sort_order")
SELECT 'Cup 18 oz', 'Cek manual', 'pcs', 'manual', 0, 'aman', COALESCE((SELECT "sort_order" FROM "ingredients" WHERE "name" = 'Cup 16 oz'), 900)
ON CONFLICT ("name") DO NOTHING;
