"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteDish } from "@/app/actions/dishes"
import { Pencil, Trash2, Search } from "lucide-react"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Ingredient, Dish, DishIngredient, MealType } from "@prisma/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DishForm } from "./dish-form"
import ReactMarkdown from "react-markdown"

// Define a type that includes the relation
interface DishWithIngredients {
  id: string
  name: string
  description: string | null
  suitableFor: MealType[]
  createdAt: Date
  updatedAt: Date
  userId: string
  ingredients: (DishIngredient & {
    ingredient: Ingredient
  })[]
}

interface DishListProps {
  dishes: DishWithIngredients[]
  availableIngredients: Ingredient[]
}

export function DishList({ dishes, availableIngredients }: DishListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const router = useRouter()

  const filteredDishes = useMemo(() => {
    if (!search.trim()) return dishes
    const term = search.toLowerCase()
    return dishes.filter(d => 
      d.name.toLowerCase().includes(term) ||
      d.description?.toLowerCase().includes(term) ||
      d.ingredients.some(i => i.ingredient.name.toLowerCase().includes(term))
    )
  }, [dishes, search])

  async function handleDelete(id: string) {
    if (!confirm("Wirklich löschen?")) return
    setDeletingId(id)
    await deleteDish(id)
    setDeletingId(null)
    router.refresh()
  }

  if (dishes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-10 border rounded-lg border-dashed">
        Keine Gerichte gefunden. Erstelle eines, um loszulegen.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Gerichte suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {filteredDishes.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-10 border rounded-lg border-dashed">
          Keine Gerichte gefunden
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDishes.map((dish) => (
        <div key={dish.id} className="border rounded-lg p-4 bg-card shadow-sm flex flex-col justify-between gap-4">
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{dish.name}</h3>
              <div className="flex gap-1 -mr-2 -mt-2">
                <Dialog open={editingId === dish.id} onOpenChange={(open) => setEditingId(open ? dish.id : null)}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                        <DialogHeader>
                            <DialogTitle>Gericht bearbeiten</DialogTitle>
                            <DialogDescription className="sr-only">
                                Bearbeite die Details des Gerichts.
                            </DialogDescription>
                        </DialogHeader>
                        <DishForm 
                            availableIngredients={availableIngredients} 
                            dish={dish} 
                            afterSave={() => setEditingId(null)} 
                        />
                    </DialogContent>
                </Dialog>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(dish.id)}
                    disabled={deletingId === dish.id}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {dish.description && (
              <div className="text-sm text-muted-foreground mb-3 prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_p]:my-1">
                <ReactMarkdown>{dish.description}</ReactMarkdown>
              </div>
            )}
            
            <div className="text-sm">
              <p className="font-medium mb-1 text-xs uppercase text-muted-foreground">Zutaten</p>
              <ul className="space-y-1">
                {dish.ingredients.map((item, idx) => (
                  <li key={idx} className="flex justify-between text-muted-foreground">
                    <span>{item.ingredient.name}</span>
                    <span>{item.amount} {item.unit}</span>
                  </li>
                ))}
                {dish.ingredients.length === 0 && (
                   <li className="text-muted-foreground italic text-xs">Keine Zutaten gelistet</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      ))}
      </div>
      )}
    </div>
  )
}
