"use server"

import { db } from "@/lib/db"
import { MealType } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { startOfWeek, endOfWeek, startOfDay } from "date-fns"

export async function getMealsForWeek(date: Date) {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 })

  try {
    const meals = await db.meal.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        dish: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    })
    return { success: true, data: meals }
  } catch (error) {
    console.error("Get Meals For Week Error:", error)
    return { success: false, error: "Failed to fetch meals" }
  }
}

const createMealSchema = z.object({
  date: z.date(),
  type: z.nativeEnum(MealType),
  dishId: z.string().min(1),
})

export async function addMeal(data: z.infer<typeof createMealSchema>) {
  const result = createMealSchema.safeParse(data)

  if (!result.success) {
    return { success: false, error: "Invalid data" }
  }

  const { date, type, dishId } = result.data
  const normalizedDate = startOfDay(date)

  try {
    // Check if meal exists for this slot
    const existingMeal = await db.meal.findUnique({
      where: {
        date_type: {
          date: normalizedDate,
          type: type,
        },
      },
    })

    if (existingMeal) {
      // Update existing
      await db.meal.update({
        where: { id: existingMeal.id },
        data: { dishId },
      })
    } else {
      // Create new
      await db.meal.create({
        data: {
          date: normalizedDate,
          type,
          dishId,
        },
      })
    }

    revalidatePath("/planner")
    return { success: true }
  } catch (error) {
    console.error("Add Meal Error:", error)
    return { success: false, error: "Failed to add meal" }
  }
}

export async function removeMeal(id: string) {
  try {
    await db.meal.delete({
      where: { id },
    })
    revalidatePath("/planner")
    return { success: true }
  } catch (error) {
    console.error("Remove Meal Error:", error)
    return { success: false, error: "Failed to remove meal" }
  }
}
