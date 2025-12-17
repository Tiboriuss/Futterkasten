"use client"

import { useState } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  ShoppingCart,
  Check,
  X,
  MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useRouter } from "next/navigation"
import { 
  createShoppingList, 
  deleteShoppingList,
  syncIngredientsFromDateRange,
  addCustomItem,
  toggleItemChecked,
  deleteItem,
  clearCheckedItems,
} from "@/app/actions/shopping-list"
import { Ingredient, ShoppingList, ShoppingListItem } from "@prisma/client"

type ShoppingListWithItems = ShoppingList & {
  items: (ShoppingListItem & { ingredient: Ingredient | null })[]
}

interface ShoppingListsViewProps {
  initialLists: ShoppingListWithItems[]
  availableIngredients: Ingredient[]
}

export function ShoppingListsView({ initialLists, availableIngredients }: ShoppingListsViewProps) {
  const router = useRouter()
  const [lists, setLists] = useState(initialLists)
  const [newListName, setNewListName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [selectedListId, setSelectedListId] = useState<string | null>(
    initialLists.length > 0 ? initialLists[0].id : null
  )
  const [newItemText, setNewItemText] = useState("")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [isAddingFromPlan, setIsAddingFromPlan] = useState(false)

  const selectedList = lists.find(l => l.id === selectedListId)
  
  // Initialize dateRange from selectedList if it has one
  const effectiveDateRange = dateRange || (selectedList?.startDate && selectedList?.endDate 
    ? { from: new Date(selectedList.startDate), to: new Date(selectedList.endDate) }
    : null
  )

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    setIsCreating(true)
    const result = await createShoppingList(newListName.trim())
    if (result.success && result.data) {
      setLists(prev => [result.data!, ...prev])
      setSelectedListId(result.data.id)
      setNewListName("")
    }
    setIsCreating(false)
  }

  const handleDeleteList = async (id: string) => {
    if (!confirm("Liste wirklich löschen?")) return
    const result = await deleteShoppingList(id)
    if (result.success) {
      setLists(prev => prev.filter(l => l.id !== id))
      if (selectedListId === id) {
        setSelectedListId(lists.length > 1 ? lists.find(l => l.id !== id)?.id || null : null)
      }
    }
  }

  const handleSyncFromDateRange = async () => {
    if (!selectedListId || !effectiveDateRange) return
    setIsAddingFromPlan(true)
    const result = await syncIngredientsFromDateRange(
      selectedListId,
      effectiveDateRange.from,
      effectiveDateRange.to
    )
    if (result.success && result.data) {
      // Update local state with the synced list data - no page reload needed
      setLists(prev => prev.map(list => 
        list.id === selectedListId ? result.data! : list
      ))
    }
    setIsAddingFromPlan(false)
  }

  const handleAddCustomItem = async () => {
    if (!selectedListId || !newItemText.trim()) return
    setIsAddingItem(true)
    const result = await addCustomItem(selectedListId, newItemText.trim())
    if (result.success && result.data) {
      setLists(prev => prev.map(list => 
        list.id === selectedListId 
          ? { ...list, items: [...list.items, result.data!] }
          : list
      ))
      setNewItemText("")
    }
    setIsAddingItem(false)
  }

  const handleToggleItem = async (itemId: string) => {
    const result = await toggleItemChecked(itemId)
    if (result.success && result.data) {
      setLists(prev => prev.map(list => ({
        ...list,
        items: list.items.map(item => 
          item.id === itemId ? result.data! : item
        )
      })))
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    const result = await deleteItem(itemId)
    if (result.success) {
      setLists(prev => prev.map(list => ({
        ...list,
        items: list.items.filter(item => item.id !== itemId)
      })))
    }
  }

  const handleClearChecked = async () => {
    if (!selectedListId) return
    const result = await clearCheckedItems(selectedListId)
    if (result.success) {
      setLists(prev => prev.map(list => 
        list.id === selectedListId
          ? { ...list, items: list.items.filter(item => !item.checked) }
          : list
      ))
    }
  }

  const checkedCount = selectedList?.items.filter(i => i.checked).length || 0
  const totalCount = selectedList?.items.length || 0

  return (
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      {/* Lists Sidebar */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Neue Liste..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
          />
          <Button 
            onClick={handleCreateList} 
            disabled={isCreating || !newListName.trim()}
            size="icon"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {lists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Noch keine Listen. Erstelle eine neue Liste.
            </p>
          ) : (
            lists.map((list) => (
              <div
                key={list.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors",
                  selectedListId === list.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted/50 hover:bg-muted"
                )}
                onClick={() => setSelectedListId(list.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  <span className="truncate font-medium">{list.name}</span>
                  <span className={cn(
                    "text-xs",
                    selectedListId === list.id ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    ({list.items.length})
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-8 w-8",
                        selectedListId === list.id && "hover:bg-primary-foreground/20"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteList(list.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </div>
      </div>

      {/* List Content */}
      <Card>
        {selectedList ? (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedList.name}</CardTitle>
                  <CardDescription>
                    {checkedCount} von {totalCount} erledigt
                  </CardDescription>
                </div>
                {checkedCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearChecked}>
                    <Check className="h-4 w-4 mr-2" />
                    Erledigte entfernen
                  </Button>
                )}
              </div>
              
              {/* Date range sync section */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t mt-4">
                <span className="text-sm text-muted-foreground shrink-0">Zeitraum:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "justify-start text-left font-normal",
                        !effectiveDateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {effectiveDateRange?.from ? (
                          effectiveDateRange.to ? (
                            <>
                              {format(effectiveDateRange.from, "d. MMM", { locale: de })} -{" "}
                              {format(effectiveDateRange.to, "d. MMM", { locale: de })}
                            </>
                          ) : (
                            format(effectiveDateRange.from, "d. MMM yyyy", { locale: de })
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
                      defaultMonth={effectiveDateRange?.from || new Date()}
                      selected={effectiveDateRange || undefined}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({ 
                            from: range.from, 
                            to: range.to || range.from 
                          })
                        }
                      }}
                      numberOfMonths={1}
                      locale={de}
                      className="md:hidden"
                    />
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={effectiveDateRange?.from || new Date()}
                      selected={effectiveDateRange || undefined}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({ 
                            from: range.from, 
                            to: range.to || range.from 
                          })
                        }
                      }}
                      numberOfMonths={2}
                      locale={de}
                      className="hidden md:block"
                    />
                  </PopoverContent>
                </Popover>
                <Button 
                  size="sm"
                  onClick={handleSyncFromDateRange}
                  disabled={!effectiveDateRange || isAddingFromPlan}
                  className="shrink-0"
                >
                  {isAddingFromPlan ? "..." : "Sync"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add new item */}
              <div className="flex gap-2">
                <Input
                  placeholder="Neuer Eintrag (z.B. Spülmittel)..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomItem()}
                />
                <Button 
                  onClick={handleAddCustomItem}
                  disabled={isAddingItem || !newItemText.trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Items list */}
              <div className="rounded-md border divide-y">
                {selectedList.items.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    <p>Liste ist leer.</p>
                    <p className="text-sm">Füge Einträge hinzu oder importiere aus dem Wochenplan.</p>
                  </div>
                ) : (
                  selectedList.items.map((item) => {
                    const displayName = item.ingredient?.name || item.customName || "Unbekannt"
                    const displayAmount = item.amount ? `${item.amount} ${item.unit || item.ingredient?.unit || ''}` : ''
                    
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center p-3 hover:bg-muted/50 transition-colors group",
                          item.checked && "bg-muted/30"
                        )}
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleToggleItem(item.id)}
                          className="mr-3"
                        />
                        <div 
                          className={cn(
                            "flex-1 cursor-pointer",
                            item.checked && "line-through text-muted-foreground"
                          )}
                          onClick={() => handleToggleItem(item.id)}
                        >
                          <span className="font-medium">{displayName}</span>
                          {!item.ingredient && item.customName && (
                            <span className="ml-2 text-xs text-muted-foreground">(Freitext)</span>
                          )}
                        </div>
                        {displayAmount && (
                          <span className={cn(
                            "text-sm font-medium mr-4",
                            item.checked && "text-muted-foreground"
                          )}>
                            {displayAmount}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Keine Liste ausgewählt</p>
            <p className="text-sm">Erstelle eine neue Liste oder wähle eine aus.</p>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
