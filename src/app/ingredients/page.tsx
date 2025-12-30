import { getIngredients } from "@/app/actions/ingredients"
import { IngredientList } from "@/components/ingredients/ingredient-list"

export const dynamic = "force-dynamic"

export default async function IngredientsPage() {
  const { data: ingredients } = await getIngredients()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Zutaten</h1>
      </div>
      <p className="text-muted-foreground">
        Zutaten werden automatisch erstellt, wenn du sie in Gerichten verwendest. 
        Hier kannst du sie umbenennen und sehen, in welchen Gerichten sie verwendet werden.
      </p>
      
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <IngredientList ingredients={ingredients || []} />
        </div>
      </div>
    </div>
  )
}
