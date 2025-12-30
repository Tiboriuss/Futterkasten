"use server"

import { db } from "@/lib/db"
import { startOfDay, endOfDay } from "date-fns"
import { revalidatePath } from "next/cache"

// Get all shopping lists
export async function getShoppingLists() {
  try {
    const lists = await db.shoppingList.findMany({
      include: {
        items: {
          include: {
            ingredient: true,
          },
          orderBy: { createdAt: 'asc' }
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, data: lists }
  } catch (error) {
    console.error("Get Shopping Lists Error:", error)
    return { success: false, error: "Failed to get shopping lists" }
  }
}

// Get a single shopping list
export async function getShoppingList(id: string) {
  try {
    const list = await db.shoppingList.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            ingredient: true,
          },
          orderBy: { createdAt: 'asc' }
        },
      },
    })
    if (!list) {
      return { success: false, error: "Shopping list not found" }
    }
    return { success: true, data: list }
  } catch (error) {
    console.error("Get Shopping List Error:", error)
    return { success: false, error: "Failed to get shopping list" }
  }
}

// Create a new shopping list
export async function createShoppingList(name: string) {
  try {
    const list = await db.shoppingList.create({
      data: { name },
      include: {
        items: {
          include: { ingredient: true }
        }
      }
    })
    revalidatePath('/shopping')
    return { success: true, data: list }
  } catch (error) {
    console.error("Create Shopping List Error:", error)
    return { success: false, error: "Failed to create shopping list" }
  }
}

// Delete a shopping list
export async function deleteShoppingList(id: string) {
  try {
    await db.shoppingList.delete({ where: { id } })
    revalidatePath('/shopping')
    return { success: true }
  } catch (error) {
    console.error("Delete Shopping List Error:", error)
    return { success: false, error: "Failed to delete shopping list" }
  }
}

// Sync ingredients from meal plan date range to a shopping list
// This REPLACES ingredient amounts (not additive) - custom items are preserved
export async function syncIngredientsFromDateRange(
  listId: string,
  from: Date,
  to: Date
) {
  try {
    const meals = await db.meal.findMany({
      where: {
        date: {
          gte: startOfDay(from),
          lte: endOfDay(to),
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

    // Aggregate ingredients from meals
    // Note: Different dishes may use different units for the same ingredient
    // We create separate entries for each ingredient+unit combination
    const aggregated: Record<string, { ingredientId: string; amount: number; unit: string }> = {}

    for (const meal of meals) {
      if (!meal.dish) continue

      for (const dishIngredient of meal.dish.ingredients) {
        const { ingredient, amount, unit } = dishIngredient
        
        // Use ingredient ID + unit as key to handle same ingredient with different units
        const key = `${ingredient.id}__${unit}`
        
        if (aggregated[key]) {
          aggregated[key].amount += amount
        } else {
          aggregated[key] = {
            ingredientId: ingredient.id,
            amount: amount,
            unit: unit,
          }
        }
      }
    }

    // Get existing ingredient-based items in the list
    const existingItems = await db.shoppingListItem.findMany({
      where: { 
        shoppingListId: listId,
        ingredientId: { not: null }
      }
    })

    const existingMap = new Map(
      existingItems.map(item => [item.ingredientId, item])
    )

    const newIngredientIds = new Set(Object.keys(aggregated))

    // Update or create items for ingredients in the meal plan
    for (const [ingredientId, data] of Object.entries(aggregated)) {
      const existing = existingMap.get(ingredientId)
      
      if (existing) {
        // Update existing item - REPLACE amount (not add)
        // Smart checkbox handling:
        // - If amount unchanged: keep checkbox state
        // - If amount increased: uncheck (need to buy more)
        // - If amount decreased: keep checkbox (already bought enough)
        const amountIncreased = data.amount > (existing.amount || 0)
        
        await db.shoppingListItem.update({
          where: { id: existing.id },
          data: { 
            amount: data.amount,
            // Only uncheck if amount increased (need to buy more)
            ...(amountIncreased ? { checked: false } : {}),
          }
        })
      } else {
        // Create new item
        await db.shoppingListItem.create({
          data: {
            shoppingListId: listId,
            ingredientId: data.ingredientId,
            amount: data.amount,
            unit: data.unit,
          }
        })
      }
    }

    // Remove ingredient items that are no longer in the meal plan for this date range
    // (but keep custom/free-text items)
    for (const [ingredientId, item] of existingMap) {
      if (ingredientId && !newIngredientIds.has(ingredientId)) {
        await db.shoppingListItem.delete({
          where: { id: item.id }
        })
      }
    }

    // Update the list's date range and return the updated list with items
    const updatedList = await db.shoppingList.update({
      where: { id: listId },
      data: {
        startDate: from,
        endDate: to,
      },
      include: {
        items: {
          include: {
            ingredient: true,
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    revalidatePath('/shopping-list')
    return { success: true, syncedCount: Object.keys(aggregated).length, data: updatedList }
  } catch (error) {
    console.error("Sync Ingredients From Date Range Error:", error)
    return { success: false, error: "Failed to sync ingredients" }
  }
}

// Add a custom (free-text) item to a shopping list
export async function addCustomItem(
  listId: string,
  customName: string,
  amount?: number,
  unit?: string
) {
  try {
    const item = await db.shoppingListItem.create({
      data: {
        shoppingListId: listId,
        customName,
        amount,
        unit,
      },
      include: { ingredient: true }
    })
    revalidatePath('/shopping')
    return { success: true, data: item }
  } catch (error) {
    console.error("Add Custom Item Error:", error)
    return { success: false, error: "Failed to add item" }
  }
}

// Add an ingredient item to a shopping list
export async function addIngredientItem(
  listId: string,
  ingredientId: string,
  amount?: number,
  unit?: string
) {
  try {
    const ingredient = await db.ingredient.findUnique({
      where: { id: ingredientId }
    })
    
    if (!ingredient) {
      return { success: false, error: "Ingredient not found" }
    }

    // Check if item already exists with same unit
    const existing = await db.shoppingListItem.findFirst({
      where: {
        shoppingListId: listId,
        ingredientId: ingredientId,
        unit: unit || null,
      }
    })

    if (existing) {
      // Update amount
      const item = await db.shoppingListItem.update({
        where: { id: existing.id },
        data: { 
          amount: (existing.amount || 0) + (amount || 0),
        },
        include: { ingredient: true }
      })
      revalidatePath('/shopping')
      return { success: true, data: item }
    }

    const item = await db.shoppingListItem.create({
      data: {
        shoppingListId: listId,
        ingredientId,
        amount,
        unit: unit || "Stück",
      },
      include: { ingredient: true }
    })
    revalidatePath('/shopping')
    return { success: true, data: item }
  } catch (error) {
    console.error("Add Ingredient Item Error:", error)
    return { success: false, error: "Failed to add item" }
  }
}

// Toggle item checked status
export async function toggleItemChecked(itemId: string) {
  try {
    const item = await db.shoppingListItem.findUnique({
      where: { id: itemId }
    })
    
    if (!item) {
      return { success: false, error: "Item not found" }
    }

    const updated = await db.shoppingListItem.update({
      where: { id: itemId },
      data: { checked: !item.checked },
      include: { ingredient: true }
    })
    
    revalidatePath('/shopping')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Toggle Item Checked Error:", error)
    return { success: false, error: "Failed to update item" }
  }
}

// Update item amount
export async function updateItemAmount(itemId: string, amount: number) {
  try {
    const updated = await db.shoppingListItem.update({
      where: { id: itemId },
      data: { amount },
      include: { ingredient: true }
    })
    revalidatePath('/shopping')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Update Item Amount Error:", error)
    return { success: false, error: "Failed to update item" }
  }
}

// Delete an item from a shopping list
export async function deleteItem(itemId: string) {
  try {
    await db.shoppingListItem.delete({ where: { id: itemId } })
    revalidatePath('/shopping')
    return { success: true }
  } catch (error) {
    console.error("Delete Item Error:", error)
    return { success: false, error: "Failed to delete item" }
  }
}

// Clear all checked items from a list
export async function clearCheckedItems(listId: string) {
  try {
    await db.shoppingListItem.deleteMany({
      where: {
        shoppingListId: listId,
        checked: true,
      }
    })
    revalidatePath('/shopping')
    return { success: true }
  } catch (error) {
    console.error("Clear Checked Items Error:", error)
    return { success: false, error: "Failed to clear items" }
  }
}

// Rename a shopping list
export async function renameShoppingList(id: string, name: string) {
  try {
    const list = await db.shoppingList.update({
      where: { id },
      data: { name }
    })
    revalidatePath('/shopping')
    return { success: true, data: list }
  } catch (error) {
    console.error("Rename Shopping List Error:", error)
    return { success: false, error: "Failed to rename list" }
  }
}
