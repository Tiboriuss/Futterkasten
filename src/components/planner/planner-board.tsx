"use client"

import { useState, Fragment } from "react"
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns"
import { de } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MealType, Dish, Meal, DishIngredient, Ingredient } from "@prisma/client"
import { addMeal, addCustomMeal, removeMeal } from "@/app/actions/planner"
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

type MealWithDish = Meal & { dish: DishWithIngredients | null, customName?: string | null }

interface PlannerBoardProps {
  initialDate: Date
  meals: MealWithDish[]
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
        <h2 className="text-lg md:text-xl font-bold capitalize">
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

      {/* Desktop Grid View */}
      <div className="hidden md:block flex-1 overflow-auto border rounded-lg bg-background">
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

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 overflow-auto space-y-4">
        {days.map((day) => (
          <div key={day.toISOString()} className="border rounded-lg bg-background overflow-hidden">
            <div className="p-3 bg-muted/50 border-b">
              <div className="font-medium capitalize">
                {format(day, "EEEE", { locale: de })}, {format(day, "d. MMM", { locale: de })}
              </div>
            </div>
            <div className="divide-y">
              {mealTypes.map((type) => {
                const meal = meals.find(m => {
                  const mDate = new Date(m.date)
                  return isSameDay(mDate, day) && m.type === type
                })
                return (
                  <div key={`${day.toISOString()}_${type}`} className="flex items-center">
                    <div className="w-24 shrink-0 p-2 text-xs uppercase text-muted-foreground font-medium bg-muted/20">
                      {mealTypeLabels[type]}
                    </div>
                    <div className="flex-1">
                      <PlannerSlot 
                        date={day} 
                        type={type} 
                        meal={meal} 
                        dishes={dishes}
                        compact
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlannerSlot({ date, type, meal, dishes, compact = false }: { date: Date, type: MealType, meal?: MealWithDish, dishes: DishWithIngredients[], compact?: boolean }) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [customInput, setCustomInput] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleAddMeal = async (dishId: string) => {
    await addMeal({ date, type, dishId })
    setSearchOpen(false)
    router.refresh()
  }

  const handleAddCustomMeal = async () => {
    if (!customInput.trim()) return
    await addCustomMeal({ date, type, customName: customInput.trim() })
    setCustomInput("")
    setShowCustomInput(false)
    setSearchOpen(false)
    router.refresh()
  }

  // Get display name - either dish name or custom name
  const displayName = meal?.dish?.name || meal?.customName || "Unbekannt"
  const isCustomMeal = !meal?.dish && meal?.customName

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
          <div className={cn("p-2 relative", compact ? "min-h-[60px]" : "min-h-[100px]")}>
              <div 
                className={cn(
                  "h-full w-full rounded-md p-2 text-xs flex transition-colors border border-transparent cursor-pointer",
                  isCustomMeal 
                    ? "bg-muted/60 hover:bg-muted/80 hover:border-muted-foreground/30" 
                    : "bg-accent/40 hover:bg-accent/60 hover:border-accent",
                  compact ? "flex-row items-center justify-between gap-2" : "flex-col justify-between"
                )}
                onClick={() => !isCustomMeal && setDetailOpen(true)}
              >
                 <span className={cn("font-medium", compact ? "line-clamp-1" : "line-clamp-3", isCustomMeal && "italic")}>
                   {displayName}
                 </span>
                 <Button 
                      type="button"
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0",
                        compact ? "h-6 w-6" : "h-6 w-6 self-end"
                      )}
                      onClick={handleRemove}
                      title="Mahlzeit entfernen"
                  >
                     <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
          </div>
          
          {/* Only show dialog for dish-based meals */}
          {meal.dish && (
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
          )}
        </>
      )
  }

  return (
    <div className={cn("p-2 flex items-center justify-center", compact ? "min-h-[60px]" : "min-h-[100px]")}>
        <Popover open={searchOpen} onOpenChange={(open) => {
          setSearchOpen(open)
          if (!open) {
            setShowCustomInput(false)
            setCustomInput("")
          }
        }}>
            <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={cn(
                    "h-full w-full rounded-md border-2 border-dashed border-muted-foreground/30",
                    "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
                    "text-muted-foreground/50 transition-all duration-200"
                  )}
                >
                    <Plus className={compact ? "h-5 w-5" : "h-6 w-6"} />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[280px]" align="center">
                {showCustomInput ? (
                  <div className="p-3 space-y-3">
                    <div className="text-sm font-medium">Eigener Eintrag</div>
                    <Input
                      placeholder="z.B. Essen gehen, Bei Freunden..."
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustomMeal()}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowCustomInput(false)}
                      >
                        Zurück
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={handleAddCustomMeal}
                        disabled={!customInput.trim()}
                      >
                        Hinzufügen
                      </Button>
                    </div>
                  </div>
                ) : (
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
                    <div className="border-t p-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => setShowCustomInput(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Eigener Eintrag...
                      </Button>
                    </div>
                  </Command>
                )}
            </PopoverContent>
        </Popover>
    </div>
  )
}
