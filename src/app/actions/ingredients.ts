"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { ingredientSchema } from "@/lib/validations/ingredient"

export async function getIngredients() {
  try {
    const ingredients = await db.ingredient.findMany({
      orderBy: { name: "asc" },
    })
    return { success: true, data: ingredients }
  } catch (error) {
    return { success: false, error: "Fehler beim Laden der Zutaten" }
  }
}

export async function createIngredient(data: z.infer<typeof ingredientSchema>) {
  const result = ingredientSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: "Ungültige Daten" }
  }

  try {
    const ingredient = await db.ingredient.create({
      data: result.data,
    })
    revalidatePath("/ingredients")
    return { success: true, data: ingredient }
  } catch (error) {
    return { success: false, error: "Fehler beim Erstellen der Zutat" }
  }
}

export async function updateIngredient(id: string, data: z.infer<typeof ingredientSchema>) {
  const result = ingredientSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: "Ungültige Daten" }
  }

  try {
    const ingredient = await db.ingredient.update({
      where: { id },
      data: result.data,
    })
    revalidatePath("/ingredients")
    return { success: true, data: ingredient }
  } catch (error) {
    return { success: false, error: "Fehler beim Aktualisieren der Zutat" }
  }
}

export async function deleteIngredient(id: string) {
  try {
    await db.ingredient.delete({
      where: { id },
    })
    revalidatePath("/ingredients")
    return { success: true }
  } catch (error) {
    return { success: false, error: "Fehler beim Löschen der Zutat" }
  }
}
