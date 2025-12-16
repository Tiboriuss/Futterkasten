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
    await db.dish.create({
      data: {
        name,
        description,
        suitableFor,
        ingredients: {
          create: ingredients.map((item) => ({
            ingredientId: item.ingredientId,
            amount: item.amount,
          })),
        },
      },
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

      // 2. Delete existing ingredients
      await tx.dishIngredient.deleteMany({
        where: { dishId: id },
      })

      // 3. Create new ingredients
      if (ingredients.length > 0) {
        await tx.dishIngredient.createMany({
          data: ingredients.map((item) => ({
            dishId: id,
            ingredientId: item.ingredientId,
            amount: item.amount,
          })),
        })
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
    await db.dish.delete({
      where: { id },
    })
    revalidatePath("/dishes")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Fehler beim Löschen des Gerichts" }
  }
}
