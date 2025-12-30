"use client"

import { Ingredient, DishIngredient, Dish } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteIngredient, updateIngredient } from "@/app/actions/ingredients"
import { Pencil, Trash2, Search, ExternalLink } from "lucide-react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import Link from "next/link"

type IngredientWithDishes = Ingredient & {
  dishes: (DishIngredient & {
    dish: {
      id: string
      name: string
    }
  })[]
}

interface IngredientListProps {
  ingredients: IngredientWithDishes[]
}

export function IngredientList({ ingredients }: IngredientListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filteredIngredients = useMemo(() => {
    if (!search.trim()) return ingredients
    const term = search.toLowerCase()
    return ingredients.filter(i => i.name.toLowerCase().includes(term))
  }, [ingredients, search])

  async function handleDelete(id: string) {
    const ingredient = ingredients.find(i => i.id === id)
    if (!ingredient) return
    
    if (ingredient.dishes.length > 0) {
      alert(`Diese Zutat wird noch in ${ingredient.dishes.length} Gericht(en) verwendet und kann nicht gelöscht werden.`)
      return
    }
    
    if (!confirm("Wirklich löschen?")) return
    setDeletingId(id)
    await deleteIngredient(id)
    setDeletingId(null)
    router.refresh()
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    
    const result = await updateIngredient(id, { name: editName.trim() })
    if (result.success) {
      setEditingId(null)
      setEditName("")
      router.refresh()
    } else {
      alert(result.error || "Fehler beim Umbenennen")
    }
  }

  if (ingredients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10 border rounded-lg border-dashed">
        Keine Zutaten vorhanden. Zutaten werden automatisch erstellt, wenn du Gerichte anlegst.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Zutaten suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="border rounded-md">
        <div className="grid grid-cols-12 border-b p-3 md:p-4 font-medium text-sm">
          <div className="col-span-4 md:col-span-4">Name</div>
          <div className="col-span-4 md:col-span-5">Verwendet in</div>
          <div className="col-span-4 md:col-span-3 text-right">Aktionen</div>
        </div>
        {filteredIngredients.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Keine Zutaten gefunden
          </div>
        ) : (
        <div className="divide-y">
          {filteredIngredients.map((ingredient) => (
          <div key={ingredient.id} className="grid grid-cols-12 p-3 md:p-4 items-center text-sm gap-2">
            <div className="col-span-4 md:col-span-4 font-medium truncate pr-2">{ingredient.name}</div>
            <div className="col-span-4 md:col-span-5 text-muted-foreground">
              {ingredient.dishes.length === 0 ? (
                <span className="text-xs italic">Nicht verwendet</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {ingredient.dishes.slice(0, 3).map((di) => (
                    <Link 
                      key={di.dish.id} 
                      href="/dishes"
                      className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded inline-flex items-center gap-1"
                    >
                      {di.dish.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ))}
                  {ingredient.dishes.length > 3 && (
                    <span className="text-xs text-muted-foreground px-2 py-1">
                      +{ingredient.dishes.length - 3} weitere
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="col-span-4 md:col-span-3 text-right flex items-center justify-end gap-0 md:gap-1">
              <Dialog open={editingId === ingredient.id} onOpenChange={(open) => {
                if (open) {
                  setEditingId(ingredient.id)
                  setEditName(ingredient.name)
                } else {
                  setEditingId(null)
                  setEditName("")
                }
              }}>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    setEditingId(ingredient.id)
                    setEditName(ingredient.name)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Zutat umbenennen</DialogTitle>
                    <DialogDescription>
                      Die Änderung wird in allen {ingredient.dishes.length} Gericht(en) übernommen.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Neuer Name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRename(ingredient.id)
                        }
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setEditingId(null)}>
                        Abbrechen
                      </Button>
                      <Button onClick={() => handleRename(ingredient.id)}>
                        Umbenennen
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(ingredient.id)}
                disabled={deletingId === ingredient.id || ingredient.dishes.length > 0}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                title={ingredient.dishes.length > 0 ? "Zutat wird noch verwendet" : "Zutat löschen"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        </div>
        )}
      </div>
    </div>
  )
}
