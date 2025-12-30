"use server"

import { db } from "@/lib/db"
import { dishSchema } from "@/lib/validations/dish"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function getDishes() {
  try {
    const dishes = await db.dish.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, data: dishes }
  } catch (error) {
    console.error("Get Dishes Error:", error)
    return { success: false, error: "Fehler beim Laden der Gerichte" }
  }
}

export async function createDish(data: z.infer<typeof dishSchema>) {
  const result = dishSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: "Ungültige Daten" }
  }

  const { name, description, suitableFor, ingredients } = result.data

  try {
    await db.$transaction(async (tx) => {
      // 1. Create or find ingredients
      const ingredientIds = await Promise.all(
        ingredients.map(async (item) => {
          // Try to find existing ingredient
          let ingredient = await tx.ingredient.findUnique({
            where: { name: item.ingredientName },
          })

          // If not found, create it
          if (!ingredient) {
            ingredient = await tx.ingredient.create({
              data: { name: item.ingredientName },
            })
          }

          return {
            ingredientId: ingredient.id,
            amount: item.amount,
            unit: item.unit,
          }
        })
      )

      // 2. Create dish with ingredients
      await tx.dish.create({
        data: {
          name,
          description,
          suitableFor: suitableFor,
          ingredients: {
            create: ingredientIds,
          },
        },
      })
    })

    revalidatePath("/dishes")
    return { success: true }
  } catch (error) {
    console.error("Create Dish Error:", error)
    return { success: false, error: "Fehler beim Erstellen des Gerichts" }
  }
}

export async function updateDish(id: string, data: z.infer<typeof dishSchema>) {
  const result = dishSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: "Ungültige Daten" }
  }

  const { name, description, suitableFor, ingredients } = result.data

  try {
    // Transaction to update dish and replace ingredients
    await db.$transaction(async (tx) => {
      // 1. Update basic info
      await tx.dish.update({
        where: { id },
        data: {
          name,
          description,
          suitableFor,
        },
      })

      // 2. Get old ingredient IDs before deleting
      const oldDishIngredients = await tx.dishIngredient.findMany({
        where: { dishId: id },
        select: { ingredientId: true },
      })
      const oldIngredientIds = oldDishIngredients.map(di => di.ingredientId)

      // 3. Delete existing dish ingredients
      await tx.dishIngredient.deleteMany({
        where: { dishId: id },
      })

      // 4. Create or find new ingredients
      if (ingredients.length > 0) {
        const ingredientData = await Promise.all(
          ingredients.map(async (item) => {
            // Try to find existing ingredient
            let ingredient = await tx.ingredient.findUnique({
              where: { name: item.ingredientName },
            })

            // If not found, create it
            if (!ingredient) {
              ingredient = await tx.ingredient.create({
                data: { name: item.ingredientName },
              })
            }

            return {
              dishId: id,
              ingredientId: ingredient.id,
              amount: item.amount,
              unit: item.unit,
            }
          })
        )

        // 5. Create new dish ingredients
        await tx.dishIngredient.createMany({
          data: ingredientData,
        })
      }

      // 6. Clean up orphaned ingredients (ingredients with no dishes)
      for (const ingredientId of oldIngredientIds) {
        const dishCount = await tx.dishIngredient.count({
          where: { ingredientId },
        })
        
        if (dishCount === 0) {
          await tx.ingredient.delete({
            where: { id: ingredientId },
          }).catch(() => {
            // Ignore errors if ingredient is still referenced elsewhere
          })
        }
      }
    })

    revalidatePath("/dishes")
    return { success: true }
  } catch (error) {
    console.error("Update Dish Error:", error)
    return { success: false, error: "Fehler beim Aktualisieren des Gerichts" }
  }
}

export async function deleteDish(id: string) {
  try {
    await db.$transaction(async (tx) => {
      // 1. Get ingredient IDs before deleting dish
      const dishIngredients = await tx.dishIngredient.findMany({
        where: { dishId: id },
        select: { ingredientId: true },
      })
      const ingredientIds = dishIngredients.map(di => di.ingredientId)

      // 2. Delete dish (cascade will delete DishIngredients)
      await tx.dish.delete({
        where: { id },
      })

      // 3. Clean up orphaned ingredients
      for (const ingredientId of ingredientIds) {
        const dishCount = await tx.dishIngredient.count({
          where: { ingredientId },
        })
        
        if (dishCount === 0) {
          await tx.ingredient.delete({
            where: { id: ingredientId },
          }).catch(() => {
            // Ignore errors if ingredient is still referenced elsewhere
          })
        }
      }
    })

    revalidatePath("/dishes")
    return { success: true }
  } catch (error) {
    console.error("Delete Dish Error:", error)
    return { success: false, error: "Fehler beim Löschen des Gerichts" }
  }
}
