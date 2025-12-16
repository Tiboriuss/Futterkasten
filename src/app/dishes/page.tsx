import { getDishes } from "@/app/actions/dishes"
import { getIngredients } from "@/app/actions/ingredients"
import { DishList } from "@/components/dishes/dish-list"
import { DishCreateButton } from "@/components/dishes/dish-create-button"

export const dynamic = "force-dynamic"

export default async function DishesPage() {
  const { data: dishes } = await getDishes()
  const { data: ingredients } = await getIngredients()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerichte</h1>
        <DishCreateButton availableIngredients={ingredients || []} />
      </div>
      <p className="text-muted-foreground">Erstelle und verwalte deine Lieblingsrezepte.</p>
      
      <DishList dishes={dishes as any || []} availableIngredients={ingredients || []} />
    </div>
  )
}
