import { db } from "@/lib/db"
import { z } from "zod"
import { tool } from "ai"
import { startOfDay, endOfDay, subWeeks, addDays, format } from "date-fns"
import { de } from "date-fns/locale"
import { MealType } from "@prisma/client"

export const aiTools = {
  getCurrentDateTime: tool({
    description: "Get the current date and time. Use this to know what day it is today.",
    inputSchema: z.object({
      _placeholder: z.string().optional().describe("Unused parameter"),
    }),
    execute: async () => {
      const now = new Date()
      return `Aktuelles Datum: ${format(now, "EEEE, d. MMMM yyyy", { locale: de })}, Uhrzeit: ${format(now, "HH:mm")} Uhr`
    },
  }),

  listIngredients: tool({
    description: "List all available ingredients in the pantry/storage",
    inputSchema: z.object({
      _placeholder: z.string().optional().describe("Unused parameter"),
    }),
    execute: async () => {
      const ingredients = await db.ingredient.findMany()
      if (ingredients.length === 0) return "Keine Zutaten im Vorrat gefunden."
      return ingredients.map(i => `${i.name} (${i.unit})`).join(", ")
    },
  }),

  listDishes: tool({
    description: "List all defined dishes/recipes with their ingredients and meal type tags. Use this to see what dishes are available. The suitableFor field shows which meal types the dish is tagged for (BREAKFAST, LUNCH, DINNER, SNACK).",
    inputSchema: z.object({
      mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).optional().describe("Optional: Filter dishes by meal type tag"),
    }),
    execute: async ({ mealType }: { mealType?: MealType }) => {
      const dishes = await db.dish.findMany({
        where: mealType ? {
          suitableFor: { has: mealType }
        } : undefined,
        include: {
          ingredients: {
            include: { ingredient: true }
          }
        }
      })
      if (dishes.length === 0) {
        return mealType 
          ? `Keine Gerichte für ${mealType} getaggt. Nutze listDishes ohne Filter um alle Gerichte zu sehen.`
          : "Keine Gerichte gefunden."
      }
      // Return structured data - AI uses IDs internally, user sees clean names
      const dishList = dishes.map(d => {
        const ings = d.ingredients.map((i: any) => `${i.amount}${i.ingredient.unit} ${i.ingredient.name}`).join(", ")
        const tags = d.suitableFor.length > 0 ? `[${d.suitableFor.join(", ")}]` : ""
        return `• ${d.name} ${tags}${d.description ? ` - ${d.description}` : ""}${ings ? ` (Zutaten: ${ings})` : ""}`
      }).join("\n")
      // Hidden section for AI to use IDs
      const idMap = dishes.map(d => `${d.name}=${d.id}`).join("|")
      return `${dishList}\n\n[AI-INTERN: ${idMap}]`
    },
  }),

  getDishByName: tool({
    description: "Search for a dish by name to get its ID. Use this before adding a meal to the plan.",
    inputSchema: z.object({
      name: z.string().describe("The name of the dish to search for (partial match)"),
    }),
    execute: async ({ name }: { name: string }) => {
      const dishes = await db.dish.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        }
      })
      if (dishes.length === 0) return `Kein Gericht mit dem Namen "${name}" gefunden.`
      const dishList = dishes.map(d => `• ${d.name}`).join("\n")
      const idMap = dishes.map(d => `${d.name}=${d.id}`).join("|")
      return `Gefunden:\n${dishList}\n\n[AI-INTERN: ${idMap}]`
    },
  }),

  getTodaysMeals: tool({
    description: "Get all meals planned for today",
    inputSchema: z.object({
      _placeholder: z.string().optional().describe("Unused parameter"),
    }),
    execute: async () => {
      const today = new Date()
      const meals = await db.meal.findMany({
        where: {
          date: {
            gte: startOfDay(today),
            lte: endOfDay(today)
          }
        },
        include: { dish: true },
        orderBy: { type: 'asc' }
      })
      
      if (meals.length === 0) return "Keine Mahlzeiten für heute geplant."
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück",
        LUNCH: "Mittagessen", 
        DINNER: "Abendessen",
        SNACK: "Snack"
      }
      
      return meals.map(m => `${mealTypeLabels[m.type]}: ${m.dish?.name || m.customName || 'Unbekannt'}`).join("\n")
    },
  }),

  getWeekMeals: tool({
    description: "Get all meals planned for the current week (Monday to Sunday)",
    inputSchema: z.object({
      _placeholder: z.string().optional().describe("Unused parameter"),
    }),
    execute: async () => {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const monday = addDays(today, dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
      const sunday = addDays(monday, 6)
      
      const meals = await db.meal.findMany({
        where: {
          date: {
            gte: startOfDay(monday),
            lte: endOfDay(sunday)
          }
        },
        include: { dish: true },
        orderBy: [{ date: 'asc' }, { type: 'asc' }]
      })
      
      if (meals.length === 0) return "Keine Mahlzeiten für diese Woche geplant."
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück",
        LUNCH: "Mittagessen",
        DINNER: "Abendessen", 
        SNACK: "Snack"
      }
      
      return meals.map(m => 
        `${format(m.date, "EEEE, d.M.", { locale: de })} - ${mealTypeLabels[m.type]}: ${m.dish?.name || m.customName || 'Unbekannt'}`
      ).join("\n")
    },
  }),

  addMealToPlan: tool({
    description: "Add a meal to the meal plan. Use getDishByName first to get the dish ID. MealType must be one of: BREAKFAST, LUNCH, DINNER, SNACK",
    inputSchema: z.object({
      dishId: z.string().describe("The ID of the dish to add"),
      date: z.string().describe("The date for the meal in ISO format (YYYY-MM-DD). Use getCurrentDateTime to know today's date."),
      mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("The type of meal: BREAKFAST, LUNCH, DINNER, or SNACK"),
    }),
    execute: async ({ dishId, date, mealType }: { dishId: string; date: string; mealType: MealType }) => {
      try {
        const dish = await db.dish.findUnique({ where: { id: dishId } })
        if (!dish) return `Fehler: Gericht mit ID "${dishId}" nicht gefunden.`
        
        const mealDate = new Date(date)
        if (isNaN(mealDate.getTime())) return `Fehler: Ungültiges Datum "${date}".`
        
        const existingMeal = await db.meal.findUnique({
          where: {
            date_type: {
              date: startOfDay(mealDate),
              type: mealType
            }
          }
        })
        
        if (existingMeal) {
          const updated = await db.meal.update({
            where: { id: existingMeal.id },
            data: { dishId },
            include: { dish: true }
          })
          return `[REFRESH] Mahlzeit aktualisiert: ${format(mealDate, "EEEE, d. MMMM", { locale: de })} - ${mealType}: ${updated.dish?.name || 'Unbekannt'}`
        }
        
        const meal = await db.meal.create({
          data: {
            date: startOfDay(mealDate),
            type: mealType,
            dishId
          },
          include: { dish: true }
        })
        
        return `[REFRESH] Mahlzeit hinzugefügt: ${format(mealDate, "EEEE, d. MMMM", { locale: de })} - ${mealType}: ${meal.dish?.name || 'Unbekannt'}`
      } catch (error) {
        return `Fehler beim Hinzufügen der Mahlzeit: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  }),

  addMultipleMeals: tool({
    description: "Add multiple meals to the meal plan in one call. Use this for bulk operations like 'plan the whole week' or 'add pasta for Monday to Wednesday'. Use listDishes first to get dish IDs.",
    inputSchema: z.object({
      meals: z.array(z.object({
        dishId: z.string().describe("The ID of the dish to add"),
        date: z.string().describe("The date for the meal in ISO format (YYYY-MM-DD)"),
        mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("The type of meal"),
      })).describe("Array of meals to add"),
    }),
    execute: async ({ meals }: { meals: Array<{ dishId: string; date: string; mealType: MealType }> }) => {
      try {
        const results: string[] = []
        let successCount = 0
        
        for (const meal of meals) {
          const dish = await db.dish.findUnique({ where: { id: meal.dishId } })
          if (!dish) {
            results.push(`❌ Gericht mit ID "${meal.dishId}" nicht gefunden`)
            continue
          }
          
          const mealDate = new Date(meal.date)
          if (isNaN(mealDate.getTime())) {
            results.push(`❌ Ungültiges Datum "${meal.date}"`)
            continue
          }
          
          const existingMeal = await db.meal.findUnique({
            where: {
              date_type: {
                date: startOfDay(mealDate),
                type: meal.mealType
              }
            }
          })
          
          if (existingMeal) {
            await db.meal.update({
              where: { id: existingMeal.id },
              data: { dishId: meal.dishId }
            })
            results.push(`✓ ${format(mealDate, "EEE d.M.", { locale: de })} ${meal.mealType}: ${dish.name} (aktualisiert)`)
          } else {
            await db.meal.create({
              data: {
                date: startOfDay(mealDate),
                type: meal.mealType,
                dishId: meal.dishId
              }
            })
            results.push(`✓ ${format(mealDate, "EEE d.M.", { locale: de })} ${meal.mealType}: ${dish.name}`)
          }
          successCount++
        }
        
        return `[REFRESH] ${successCount}/${meals.length} Mahlzeiten hinzugefügt:\n${results.join('\n')}`
      } catch (error) {
        return `Fehler beim Hinzufügen der Mahlzeiten: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  }),

  getMealHistory: tool({
    description: "Get meal history for a specific past time range. Use this to answer 'what did I eat last week?' etc.",
    inputSchema: z.object({
      weeksBack: z.number().default(0).describe("How many weeks back to look. 0 is current week, 1 is last week, etc."),
    }),
    execute: async ({ weeksBack }: { weeksBack: number }) => {
      const today = new Date()
      
      const meals = await db.meal.findMany({
        where: {
          date: {
            gte: startOfDay(subWeeks(today, weeksBack + 1)),
            lte: endOfDay(today)
          }
        },
        include: { dish: true },
        orderBy: { date: 'desc' }
      })
      
      if (meals.length === 0) return "Keine Mahlzeiten für diesen Zeitraum gefunden."
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück",
        LUNCH: "Mittagessen",
        DINNER: "Abendessen",
        SNACK: "Snack"
      }
      
      return meals.map(m => 
        `${format(m.date, "EEEE, d.M.", { locale: de })} (${mealTypeLabels[m.type]}): ${m.dish?.name || m.customName || 'Unbekannt'}`
      ).join("\n")
    },
  }),

  getMealByDateAndType: tool({
    description: "Get a specific meal by date and type to find its ID for removal or modification",
    inputSchema: z.object({
      date: z.string().describe("The date in ISO format (YYYY-MM-DD)"),
      mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("The type of meal"),
    }),
    execute: async ({ date, mealType }: { date: string; mealType: MealType }) => {
      const mealDate = new Date(date)
      if (isNaN(mealDate.getTime())) return `Fehler: Ungültiges Datum "${date}".`
      
      const meal = await db.meal.findUnique({
        where: {
          date_type: {
            date: startOfDay(mealDate),
            type: mealType
          }
        },
        include: { dish: true }
      })
      
      if (!meal) {
        const mealTypeLabels: Record<MealType, string> = {
          BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
        }
        return `Keine Mahlzeit gefunden für ${format(mealDate, "EEEE, d. MMMM", { locale: de })} - ${mealTypeLabels[mealType]}.`
      }
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
      }
      
      return `Gefunden: ${meal.dish?.name || meal.customName || 'Unbekannt'} am ${format(mealDate, "EEEE, d. MMMM", { locale: de })} - ${mealTypeLabels[mealType]} (Meal-ID: ${meal.id})`
    },
  }),

  previewRemoveMeal: tool({
    description: "Preview what meal would be removed. ALWAYS use this before removeMeal to show the user what will be deleted and ask for confirmation.",
    inputSchema: z.object({
      date: z.string().describe("The date in ISO format (YYYY-MM-DD)"),
      mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("The type of meal"),
    }),
    execute: async ({ date, mealType }: { date: string; mealType: MealType }) => {
      const mealDate = new Date(date)
      if (isNaN(mealDate.getTime())) return `Fehler: Ungültiges Datum "${date}".`
      
      const meal = await db.meal.findUnique({
        where: {
          date_type: {
            date: startOfDay(mealDate),
            type: mealType
          }
        },
        include: { dish: true }
      })
      
      if (!meal) {
        const mealTypeLabels: Record<MealType, string> = {
          BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
        }
        return `Keine Mahlzeit gefunden für ${format(mealDate, "EEEE, d. MMMM", { locale: de })} - ${mealTypeLabels[mealType]}.`
      }
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
      }
      
      return `VORSCHAU LÖSCHEN: "${meal.dish?.name || meal.customName || 'Unbekannt'}" am ${format(mealDate, "EEEE, d. MMMM", { locale: de })} (${mealTypeLabels[mealType]}). Frage den Nutzer ob er das wirklich löschen möchte!`
    },
  }),

  removeMeal: tool({
    description: "Remove a meal from the plan. IMPORTANT: Only use this AFTER the user has confirmed the deletion via previewRemoveMeal!",
    inputSchema: z.object({
      date: z.string().describe("The date in ISO format (YYYY-MM-DD)"),
      mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("The type of meal"),
      userConfirmed: z.boolean().describe("Must be true - indicates user has confirmed the deletion"),
    }),
    execute: async ({ date, mealType, userConfirmed }: { date: string; mealType: MealType; userConfirmed: boolean }) => {
      if (!userConfirmed) {
        return "Fehler: Löschung nicht bestätigt. Bitte frage den Nutzer zuerst mit previewRemoveMeal ob er wirklich löschen möchte."
      }
      
      const mealDate = new Date(date)
      if (isNaN(mealDate.getTime())) return `Fehler: Ungültiges Datum "${date}".`
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
      }
      
      try {
        const meal = await db.meal.findUnique({
          where: {
            date_type: {
              date: startOfDay(mealDate),
              type: mealType
            }
          },
          include: { dish: true }
        })
        
        if (!meal) {
          return `Keine Mahlzeit gefunden für ${format(mealDate, "EEEE, d. MMMM", { locale: de })} - ${mealTypeLabels[mealType]}.`
        }
        
        await db.meal.delete({ where: { id: meal.id } })
        
        return `[REFRESH] Gelöscht: "${meal.dish?.name || meal.customName || 'Unbekannt'}" am ${format(mealDate, "EEEE, d. MMMM", { locale: de })} (${mealTypeLabels[mealType]})`
      } catch (error) {
        return `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  }),

  previewRemoveMultipleMeals: tool({
    description: "Preview multiple meals that would be removed. ALWAYS use this before removeMultipleMeals to show the user what will be deleted.",
    inputSchema: z.object({
      startDate: z.string().describe("Start date in ISO format (YYYY-MM-DD)"),
      endDate: z.string().describe("End date in ISO format (YYYY-MM-DD)"),
      mealTypes: z.array(z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])).optional().describe("Optional: filter by meal types. If not provided, all types are included."),
    }),
    execute: async ({ startDate, endDate, mealTypes }: { startDate: string; endDate: string; mealTypes?: MealType[] }) => {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "Fehler: Ungültiges Datum."
      }
      
      const meals = await db.meal.findMany({
        where: {
          date: {
            gte: startOfDay(start),
            lte: endOfDay(end)
          },
          ...(mealTypes && mealTypes.length > 0 ? { type: { in: mealTypes } } : {})
        },
        include: { dish: true },
        orderBy: [{ date: 'asc' }, { type: 'asc' }]
      })
      
      if (meals.length === 0) {
        return "Keine Mahlzeiten im angegebenen Zeitraum gefunden."
      }
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
      }
      
      const preview = meals.map(m => 
        `- ${format(m.date, "EEEE, d.M.", { locale: de })} (${mealTypeLabels[m.type]}): ${m.dish?.name || m.customName || 'Unbekannt'}`
      ).join("\n")
      
      return `VORSCHAU LÖSCHEN (${meals.length} Einträge):\n${preview}\n\nFrage den Nutzer ob er diese ${meals.length} Einträge wirklich löschen möchte!`
    },
  }),

  removeMultipleMeals: tool({
    description: "Remove multiple meals from the plan. IMPORTANT: Only use AFTER user confirmed via previewRemoveMultipleMeals!",
    inputSchema: z.object({
      startDate: z.string().describe("Start date in ISO format (YYYY-MM-DD)"),
      endDate: z.string().describe("End date in ISO format (YYYY-MM-DD)"),
      mealTypes: z.array(z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])).optional().describe("Optional: filter by meal types"),
      userConfirmed: z.boolean().describe("Must be true - indicates user has confirmed the deletion"),
    }),
    execute: async ({ startDate, endDate, mealTypes, userConfirmed }: { startDate: string; endDate: string; mealTypes?: MealType[]; userConfirmed: boolean }) => {
      if (!userConfirmed) {
        return "Fehler: Löschung nicht bestätigt. Bitte frage den Nutzer zuerst mit previewRemoveMultipleMeals."
      }
      
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return "Fehler: Ungültiges Datum."
      }
      
      try {
        const result = await db.meal.deleteMany({
          where: {
            date: {
              gte: startOfDay(start),
              lte: endOfDay(end)
            },
            ...(mealTypes && mealTypes.length > 0 ? { type: { in: mealTypes } } : {})
          }
        })
        
        return `[REFRESH] ${result.count} Mahlzeit(en) gelöscht vom ${format(start, "d.M.", { locale: de })} bis ${format(end, "d.M.", { locale: de })}.`
      } catch (error) {
        return `Fehler beim Löschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  }),

  moveMeal: tool({
    description: "Move a meal to a different date and/or meal type. This copies the meal to the new slot and removes it from the old slot.",
    inputSchema: z.object({
      fromDate: z.string().describe("Original date in ISO format (YYYY-MM-DD)"),
      fromMealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("Original meal type"),
      toDate: z.string().describe("New date in ISO format (YYYY-MM-DD)"),
      toMealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("New meal type"),
    }),
    execute: async ({ fromDate, fromMealType, toDate, toMealType }: { 
      fromDate: string; fromMealType: MealType; toDate: string; toMealType: MealType 
    }) => {
      const fromDateParsed = new Date(fromDate)
      const toDateParsed = new Date(toDate)
      
      if (isNaN(fromDateParsed.getTime()) || isNaN(toDateParsed.getTime())) {
        return "Fehler: Ungültiges Datum."
      }
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
      }
      
      try {
        const sourceMeal = await db.meal.findUnique({
          where: {
            date_type: {
              date: startOfDay(fromDateParsed),
              type: fromMealType
            }
          },
          include: { dish: true }
        })
        
        if (!sourceMeal) {
          return `Keine Mahlzeit gefunden für ${format(fromDateParsed, "EEEE, d. MMMM", { locale: de })} - ${mealTypeLabels[fromMealType]}.`
        }
        
        const targetMeal = await db.meal.findUnique({
          where: {
            date_type: {
              date: startOfDay(toDateParsed),
              type: toMealType
            }
          },
          include: { dish: true }
        })
        
        if (targetMeal) {
          return `Fehler: Am ${format(toDateParsed, "EEEE, d. MMMM", { locale: de })} (${mealTypeLabels[toMealType]}) ist bereits "${targetMeal.dish?.name || targetMeal.customName || 'Unbekannt'}" geplant. Bitte zuerst diesen Eintrag löschen oder ein anderes Ziel wählen.`
        }
        
        await db.meal.update({
          where: { id: sourceMeal.id },
          data: {
            date: startOfDay(toDateParsed),
            type: toMealType
          }
        })
        
        return `[REFRESH] Verschoben: "${sourceMeal.dish?.name || sourceMeal.customName || 'Unbekannt'}" von ${format(fromDateParsed, "EEEE, d.M.", { locale: de })} (${mealTypeLabels[fromMealType]}) nach ${format(toDateParsed, "EEEE, d.M.", { locale: de })} (${mealTypeLabels[toMealType]})`
      } catch (error) {
        return `Fehler beim Verschieben: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  }),

  swapMeals: tool({
    description: "Swap two meals with each other. Both meals must exist.",
    inputSchema: z.object({
      date1: z.string().describe("First meal date in ISO format (YYYY-MM-DD)"),
      mealType1: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("First meal type"),
      date2: z.string().describe("Second meal date in ISO format (YYYY-MM-DD)"),
      mealType2: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]).describe("Second meal type"),
    }),
    execute: async ({ date1, mealType1, date2, mealType2 }: { 
      date1: string; mealType1: MealType; date2: string; mealType2: MealType 
    }) => {
      const date1Parsed = new Date(date1)
      const date2Parsed = new Date(date2)
      
      if (isNaN(date1Parsed.getTime()) || isNaN(date2Parsed.getTime())) {
        return "Fehler: Ungültiges Datum."
      }
      
      const mealTypeLabels: Record<MealType, string> = {
        BREAKFAST: "Frühstück", LUNCH: "Mittagessen", DINNER: "Abendessen", SNACK: "Snack"
      }
      
      try {
        const meal1 = await db.meal.findUnique({
          where: { date_type: { date: startOfDay(date1Parsed), type: mealType1 } },
          include: { dish: true }
        })
        
        const meal2 = await db.meal.findUnique({
          where: { date_type: { date: startOfDay(date2Parsed), type: mealType2 } },
          include: { dish: true }
        })
        
        if (!meal1 || !meal2) {
          const missing = []
          if (!meal1) missing.push(`${format(date1Parsed, "d.M.", { locale: de })} (${mealTypeLabels[mealType1]})`)
          if (!meal2) missing.push(`${format(date2Parsed, "d.M.", { locale: de })} (${mealTypeLabels[mealType2]})`)
          return `Fehler: Keine Mahlzeit gefunden für: ${missing.join(", ")}. Beide Mahlzeiten müssen existieren zum Tauschen.`
        }
        
        await db.$transaction([
          db.meal.update({
            where: { id: meal1.id },
            data: { dishId: meal2.dishId }
          }),
          db.meal.update({
            where: { id: meal2.id },
            data: { dishId: meal1.dishId }
          })
        ])
        
        return `[REFRESH] Getauscht: "${meal1.dish?.name || meal1.customName || 'Unbekannt'}" (${format(date1Parsed, "d.M.", { locale: de })} ${mealTypeLabels[mealType1]}) ↔ "${meal2.dish?.name || meal2.customName || 'Unbekannt'}" (${format(date2Parsed, "d.M.", { locale: de })} ${mealTypeLabels[mealType2]})`
      } catch (error) {
        return `Fehler beim Tauschen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  }),
}
