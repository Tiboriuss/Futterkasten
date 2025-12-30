"use client"

import { Ingredient } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteIngredient } from "@/app/actions/ingredients"
import { Pencil, Trash2, Search } from "lucide-react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { IngredientForm } from "./ingredient-form"

interface IngredientListProps {
  ingredients: Ingredient[]
}

export function IngredientList({ ingredients }: IngredientListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filteredIngredients = useMemo(() => {
    if (!search.trim()) return ingredients
    const term = search.toLowerCase()
    return ingredients.filter(i => i.name.toLowerCase().includes(term))
  }, [ingredients, search])

  async function handleDelete(id: string) {
    if (!confirm("Wirklich löschen?")) return
    setDeletingId(id)
    await deleteIngredient(id)
    setDeletingId(null)
    router.refresh()
  }

  if (ingredients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10 border rounded-lg border-dashed">
        Keine Zutaten gefunden. Füge oben welche hinzu.
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
          <div className="col-span-5 md:col-span-6">Name</div>
          <div className="col-span-3 md:col-span-3">Einheit</div>
          <div className="col-span-4 md:col-span-3 text-right">Aktionen</div>
        </div>
        {filteredIngredients.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Keine Zutaten gefunden
          </div>
        ) : (
        <div className="divide-y">
          {filteredIngredients.map((ingredient) => (
          <div key={ingredient.id} className="grid grid-cols-12 p-3 md:p-4 items-center text-sm">
            <div className="col-span-5 md:col-span-6 font-medium truncate pr-2">{ingredient.name}</div>
            <div className="col-span-3 md:col-span-3 text-muted-foreground truncate">{ingredient.unit}</div>
            <div className="col-span-4 md:col-span-3 text-right flex items-center justify-end gap-0 md:gap-1">
              <Dialog open={editingId === ingredient.id} onOpenChange={(open) => setEditingId(open ? ingredient.id : null)}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Zutat bearbeiten</DialogTitle>
                        <DialogDescription className="sr-only">
                            Bearbeite die Details deiner Zutat.
                        </DialogDescription>
                    </DialogHeader>
                    <IngredientForm ingredient={ingredient} afterSave={() => setEditingId(null)} />
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(ingredient.id)}
                disabled={deletingId === ingredient.id}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
