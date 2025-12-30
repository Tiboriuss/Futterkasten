-- AlterTable: Remove unit column from Ingredient table
ALTER TABLE "Ingredient" DROP COLUMN IF EXISTS "unit";

-- AlterTable: Add unit column to DishIngredient table
-- First add as nullable to handle existing data
ALTER TABLE "DishIngredient" ADD COLUMN IF NOT EXISTS "unit" TEXT;

-- Update existing DishIngredient records to use the unit from their linked Ingredient
-- This migration assumes existing ingredients have a unit that should be preserved
UPDATE "DishIngredient" di
SET "unit" = COALESCE(
  (SELECT "unit" FROM "Ingredient" i WHERE i."id" = di."ingredientId"),
  'g'
)
WHERE "unit" IS NULL;

-- Now make unit NOT NULL since all records have been updated
ALTER TABLE "DishIngredient" ALTER COLUMN "unit" SET NOT NULL;
