import { getIngredients } from "@/app/actions/ingredients"
import { IngredientForm } from "@/components/ingredients/ingredient-form"
import { IngredientList } from "@/components/ingredients/ingredient-list"

export const dynamic = "force-dynamic"

export default async function IngredientsPage() {
  const { data: ingredients } = await getIngredients()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Zutaten</h1>
      </div>
      <p className="text-muted-foreground">Verwalte hier deinen Vorrat und Kochzutaten.</p>
      
      <div className="grid gap-8 md:grid-cols-[350px_1fr]">
        <div className="space-y-6">
          <div className="rounded-lg border p-4 shadow-sm bg-card">
            <h2 className="font-semibold mb-4">Neue Zutat hinzufügen</h2>
            <IngredientForm />
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
              <h2 className="font-semibold mb-4">Zutatenliste</h2>
              <IngredientList ingredients={ingredients || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
