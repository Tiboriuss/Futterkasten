-- AlterTable: Add unit column to DishIngredient table first
-- Add as nullable to handle existing data
ALTER TABLE "DishIngredient" ADD COLUMN IF NOT EXISTS "unit" TEXT;

-- Update existing DishIngredient records to use the unit from their linked Ingredient
-- Only if Ingredient.unit column exists (for existing databases)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Ingredient' AND column_name = 'unit'
  ) THEN
    UPDATE "DishIngredient" di
    SET "unit" = COALESCE(
      (SELECT "unit" FROM "Ingredient" i WHERE i."id" = di."ingredientId"),
      'g'
    )
    WHERE "unit" IS NULL;
  END IF;
END $$;

-- Set default 'g' for any remaining NULL units (for fresh databases)
UPDATE "DishIngredient" SET "unit" = 'g' WHERE "unit" IS NULL;

-- Now make unit NOT NULL since all records have been updated
ALTER TABLE "DishIngredient" ALTER COLUMN "unit" SET NOT NULL;

-- AlterTable: Remove unit column from Ingredient table (only if it exists)
ALTER TABLE "Ingredient" DROP COLUMN IF EXISTS "unit";
