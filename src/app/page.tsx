import { getDishes } from "@/app/actions/dishes"
import { getMealsForWeek } from "@/app/actions/planner"
import { PlannerBoard } from "@/components/planner/planner-board"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const today = new Date()
  const { data: meals } = await getMealsForWeek(today)
  const { data: dishes } = await getDishes()

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Wochenplaner</h1>
      </div>
      
      <PlannerBoard 
        initialDate={today} 
        meals={meals || []} 
        dishes={dishes as any || []} 
      />
    </div>
  )
}
