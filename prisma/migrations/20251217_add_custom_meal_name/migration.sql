-- AlterTable: Make dishId optional and add customName for free-text meals
ALTER TABLE "Meal" ALTER COLUMN "dishId" DROP NOT NULL;
ALTER TABLE "Meal" ADD COLUMN "customName" TEXT;
