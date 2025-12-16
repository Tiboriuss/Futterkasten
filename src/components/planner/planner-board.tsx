"use client"

import { useState, Fragment } from "react"
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns"
import { de } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { MealType, Dish, Meal, DishIngredient, Ingredient } from "@prisma/client"
import { addMeal, removeMeal } from "@/app/actions/planner"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

type DishWithIngredients = Dish & { 
  ingredients: (DishIngredient & { ingredient: Ingredient })[] 
}

interface PlannerBoardProps {
  initialDate: Date
  meals: (Meal & { dish: DishWithIngredients })[]
  dishes: DishWithIngredients[]
}

const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK]

const mealTypeLabels: Record<MealType, string> = {
  [MealType.BREAKFAST]: "Frühstück",
  [MealType.LUNCH]: "Mittagessen",
  [MealType.DINNER]: "Abendessen",
  [MealType.SNACK]: "Snack",
}

export function PlannerBoard({ initialDate, meals, dishes }: PlannerBoardProps) {
  const [currentDate, setCurrentDate] = useState(initialDate)

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const handlePreviousWeek = () => setCurrentDate((prev) => addDays(prev, -7))
  const handleNextWeek = () => setCurrentDate((prev) => addDays(prev, 7))

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold capitalize">
          {format(weekStart, "d. MMM", { locale: de })} - {format(weekEnd, "d. MMM yyyy", { locale: de })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border rounded-lg bg-background">
        <div className="grid grid-cols-8 min-w-[800px] h-full divide-x divide-y">
           {/* Header Row */}
           <div className="p-2 font-medium text-muted-foreground bg-muted/50"></div>
           {days.map((day) => (
             <div key={day.toISOString()} className="p-2 font-medium text-center bg-muted/50">
                <div className="text-sm text-muted-foreground capitalize">{format(day, "EEE", { locale: de })}</div>
                <div className="text-lg">{format(day, "d")}</div>
             </div>
           ))}

           {/* Meal Rows */}
           {mealTypes.map((type) => (
             <Fragment key={type}>
               <div className="p-2 font-medium text-xs uppercase text-muted-foreground flex items-center justify-center bg-muted/20">
                  {mealTypeLabels[type]}
               </div>
               {days.map((day) => {
                 const dateStr = day.toISOString()
                 const slotId = `${dateStr}__${type}`
                 const meal = meals.find(m => {
                    const mDate = new Date(m.date)
                    return isSameDay(mDate, day) && m.type === type
                 })

                 return (
                   <PlannerSlot 
                      key={slotId} 
                      date={day} 
                      type={type} 
                      meal={meal} 
                      dishes={dishes}
                   />
                 )
               })}
             </Fragment>
           ))}
        </div>
      </div>
    </div>
  )
}

function PlannerSlot({ date, type, meal, dishes }: { date: Date, type: MealType, meal?: Meal & { dish: DishWithIngredients }, dishes: DishWithIngredients[] }) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleAddMeal = async (dishId: string) => {
    await addMeal({ date, type, dishId })
    setSearchOpen(false)
    router.refresh()
  }

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (meal) {
      if (!confirm("Mahlzeit wirklich entfernen?")) return
      await removeMeal(meal.id)
      router.refresh()
    }
  }

  if (meal) {
      return (
        <>
          <div className="p-2 min-h-[100px] relative">
              <div 
                className="h-full w-full bg-accent/40 hover:bg-accent/60 rounded-md p-2 text-xs flex flex-col justify-between transition-colors border border-transparent hover:border-accent cursor-pointer"
                onClick={() => setDetailOpen(true)}
              >
                 <span className="font-medium line-clamp-3">{meal.dish.name}</span>
                 <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 self-end text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={handleRemove}
                      title="Mahlzeit entfernen"
                  >
                     <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
          </div>
          
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">{meal.dish.name}</DialogTitle>
                <DialogDescription className="sr-only">
                  Details zum Gericht {meal.dish.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {meal.dish.ingredients.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Zutaten</h4>
                    <ul className="space-y-1">
                      {meal.dish.ingredients.map((di: any) => (
                        <li key={di.id} className="text-sm flex justify-between">
                          <span>{di.ingredient.name}</span>
                          <span className="text-muted-foreground">{di.amount} {di.ingredient.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meal.dish.description && (
                  <div>
                    <h4 className="font-semibold mb-2">Rezept</h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{meal.dish.description}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {!meal.dish.description && meal.dish.ingredients.length === 0 && (
                  <p className="text-muted-foreground text-sm">Keine weiteren Details verfügbar.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )
  }

  return (
    <div className="p-2 min-h-[100px] flex items-center justify-center">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "h-full w-full rounded-md border-2 border-dashed border-muted-foreground/30",
                    "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                    "text-muted-foreground/50 transition-all duration-200"
                  )}
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[250px]" align="center">
                <Command>
                    <CommandInput placeholder="Gericht suchen..." />
                    <CommandList>
                        <CommandEmpty>Kein Gericht gefunden.</CommandEmpty>
                        <CommandGroup>
                            {dishes.map((dish) => (
                                <CommandItem
                                    key={dish.id}
                                    value={dish.name}
                                    onSelect={() => handleAddMeal(dish.id)}
                                >
                                    <Check className={cn("mr-2 h-4 w-4 opacity-0")} />
                                    {dish.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    </div>
  )
}
