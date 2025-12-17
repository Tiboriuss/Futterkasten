"use client"

import { useState } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
interface ShoppingListItem {
  ingredientId: string
  name: string
  amount: number
  unit: string
}
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { useBasePath } from "@/lib/use-base-path"

interface ShoppingListViewProps {
  initialData: ShoppingListItem[]
  from: Date
  to: Date
}

export function ShoppingListView({ initialData, from, to }: ShoppingListViewProps) {
  const router = useRouter()
  const basePath = useBasePath()
  const [date, setDate] = useState<{ from: Date; to: Date }>({
    from,
    to,
  })
  
  // Local state for checking off items (persists only in session for now)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleDateSelect = (range: any) => {
    if (range?.from) {
        const newRange = { from: range.from, to: range.to || range.from }
        setDate(newRange)
        
        const params = new URLSearchParams()
        params.set("from", newRange.from.toISOString())
        params.set("to", newRange.to.toISOString())
        router.push(`${basePath}/shopping-list?${params.toString()}`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full sm:w-[300px] justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "d. MMM", { locale: de })} -{" "}
                      {format(date.to, "d. MMM y", { locale: de })}
                    </>
                  ) : (
                    format(date.from, "d. MMM y", { locale: de })
                  )
                ) : (
                  "Zeitraum wählen"
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={1}
              locale={de}
              className="md:hidden"
            />
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              locale={de}
              className="hidden md:block"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-md border">
        {initialData.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground">
             Keine Mahlzeiten für diesen Zeitraum geplant. Füge Mahlzeiten im Wochenplaner hinzu, um eine Einkaufsliste zu generieren.
           </div>
        ) : (
          <div className="divide-y">
            {initialData.map((item) => {
               const isChecked = checkedItems[item.ingredientId] ?? false
               
               return (
                <div 
                    key={item.ingredientId} 
                    className={cn(
                        "flex items-center p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                        isChecked && "bg-muted/30"
                    )}
                    onClick={() => toggleItem(item.ingredientId)}
                >
                  <Checkbox 
                    checked={isChecked}
                    onCheckedChange={() => toggleItem(item.ingredientId)}
                    className="mr-4"
                  />
                  <div className={cn("flex-1", isChecked && "line-through text-muted-foreground")}>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className={cn("text-sm font-medium", isChecked && "text-muted-foreground")}>
                    {item.amount} {item.unit}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
