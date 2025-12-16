import { getShoppingLists } from "@/app/actions/shopping-list"
import { ShoppingListsView } from "@/components/shopping-list/shopping-lists-view"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function ShoppingListPage() {
  const { data: lists } = await getShoppingLists()
  
  // Get all ingredients for the ingredient picker
  const ingredients = await db.ingredient.findMany({
    orderBy: { name: 'asc' }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Einkaufslisten</h1>
      </div>
      <p className="text-muted-foreground">Erstelle und verwalte deine Einkaufslisten.</p>
      
      <ShoppingListsView 
        initialLists={lists || []} 
        availableIngredients={ingredients}
      />
    </div>
  )
}
