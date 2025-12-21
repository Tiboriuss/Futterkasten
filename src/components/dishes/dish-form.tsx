"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { createDish, updateDish } from "@/app/actions/dishes"
import { createIngredient } from "@/app/actions/ingredients"
import { dishSchema, DishFormValues } from "@/lib/validations/dish"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ingredient, Dish, DishIngredient } from "@prisma/client"
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const UNITS = [
  { label: "Gramm (g)", value: "g" },
  { label: "Milliliter (ml)", value: "ml" },
  { label: "Becher", value: "Becher" },
  { label: "Teelöffel", value: "Teelöffel" },
  { label: "Esslöffel", value: "Esslöffel" },
  { label: "Stück", value: "Stück" },
  { label: "Packung", value: "Packung" },
]

interface DishFormProps {
  availableIngredients: Ingredient[]
  dish?: Dish & { ingredients: (DishIngredient & { ingredient: Ingredient })[] }
  afterSave?: () => void
}

export function DishForm({ availableIngredients: initialIngredients, dish, afterSave }: DishFormProps) {
  const [loading, setLoading] = useState(false)
  const [availableIngredients, setAvailableIngredients] = useState(initialIngredients)
  const [newIngredientDialogOpen, setNewIngredientDialogOpen] = useState(false)
  const [newIngredientName, setNewIngredientName] = useState("")
  const [newIngredientUnit, setNewIngredientUnit] = useState("")
  const [newIngredientForIndex, setNewIngredientForIndex] = useState<number | null>(null)
  const [creatingIngredient, setCreatingIngredient] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()
  
  const handleCreateIngredient = async () => {
    if (!newIngredientName.trim() || !newIngredientUnit.trim()) return
    setCreatingIngredient(true)
    
    const result = await createIngredient({
      name: newIngredientName.trim(),
      unit: newIngredientUnit.trim(),
    })
    
    if (result.success && result.data) {
      // Add to available ingredients
      setAvailableIngredients(prev => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)))
      
      // If we were adding for a specific index, select it
      if (newIngredientForIndex !== null) {
        form.setValue(`ingredients.${newIngredientForIndex}.ingredientId`, result.data.id)
      }
      
      // Reset dialog
      setNewIngredientName("")
      setNewIngredientUnit("")
      setNewIngredientForIndex(null)
      setNewIngredientDialogOpen(false)
    } else {
      alert("Fehler beim Erstellen der Zutat")
    }
    
    setCreatingIngredient(false)
  }

  const defaultValues: DishFormValues = {
    name: dish?.name || "",
    description: dish?.description || "",
    suitableFor: (dish?.suitableFor as ("BREAKFAST" | "LUNCH" | "DINNER" | "SNACK")[]) || [],
    ingredients: dish?.ingredients.map((di: any) => ({
      ingredientId: di.ingredientId,
      amount: di.amount
    })) || [],
  }

  const form = useForm<DishFormValues>({
    resolver: zodResolver(dishSchema) as any,
    defaultValues,
    mode: "onChange",
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  })

  async function onSubmit(data: DishFormValues) {
    setLoading(true)
    let result

    try {
      if (dish) {
          result = await updateDish(dish.id, data)
      } else {
          result = await createDish(data)
      }
      
      if (result.success) {
        if(!dish) {
            form.reset({
              name: "",
              description: "",
              suitableFor: [],
              ingredients: [],
            })
        }
        router.refresh()
        if(afterSave) afterSave()
      } else {
        console.error("Action error:", result.error)
        alert(`Fehler: ${result.error}`)
      }
    } catch (e) {
      console.error("Submission error:", e)
      alert("Ein unerwarteter Fehler ist aufgetreten.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Spaghetti Bolognese" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rezept / Beschreibung (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Rezept hier eingeben... (Markdown wird unterstützt: **fett**, *kursiv*, - Listen, etc.)"
                  className="min-h-[200px] font-mono text-sm"
                  {...field} 
                  value={field.value || ""} 
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">Tipp: Markdown-Formatierung wird unterstützt</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="suitableFor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geeignet für (Optional)</FormLabel>
              <p className="text-xs text-muted-foreground mb-2">Hilft der AI bei Vorschlägen - hat keine Auswirkung auf manuelle Einträge</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "BREAKFAST", label: "Frühstück" },
                  { value: "LUNCH", label: "Mittagessen" },
                  { value: "DINNER", label: "Abendessen" },
                  { value: "SNACK", label: "Snack" },
                ].map((option) => {
                  const isSelected = field.value?.includes(option.value as any)
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const current = field.value || []
                        if (isSelected) {
                          field.onChange(current.filter((v: string) => v !== option.value))
                        } else {
                          field.onChange([...current, option.value])
                        }
                      }}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Zutaten</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ ingredientId: "", amount: 0 })}
            >
              <Plus className="mr-2 h-4 w-4" /> Zutat hinzufügen
            </Button>
          </div>

          {fields.map((field, index) => {
             const currentIngredientId = form.watch(`ingredients.${index}.ingredientId`)
             const selectedIngredient = availableIngredients.find(i => i.id === currentIngredientId)

             return (
              <div key={field.id} className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.ingredientId`}
                  render={({ field }) => (
                    <FormItem className="flex-1 flex flex-col">
                      <FormLabel className="sr-only">Zutat</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? availableIngredients.find(
                                    (ingredient) => ingredient.id === field.value
                                  )?.name
                                : "Zutat wählen"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(95vw-2rem)] sm:w-[300px] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput 
                              placeholder="Zutat suchen..." 
                              value={searchTerm}
                              onValueChange={setSearchTerm}
                            />
                            <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">Keine Zutat gefunden.</p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setNewIngredientForIndex(index)
                                        setNewIngredientName(searchTerm)
                                        setNewIngredientDialogOpen(true)
                                      }}
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Neue Zutat erstellen
                                    </Button>
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                {availableIngredients.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map((ingredient) => (
                                    <CommandItem
                                    value={ingredient.name} // Search by name
                                    key={ingredient.id}
                                    onSelect={() => {
                                        form.setValue(`ingredients.${index}.ingredientId`, ingredient.id)
                                    }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        ingredient.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                    />
                                    {ingredient.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => {
                                      setNewIngredientForIndex(index)
                                      setNewIngredientName(searchTerm)
                                      setNewIngredientDialogOpen(true)
                                    }}
                                    className="text-muted-foreground"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Neue Zutat erstellen...
                                  </CommandItem>
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.amount`}
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-24">
                      <FormLabel className="sr-only">Menge</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <Input 
                            type="number" 
                            step="1" 
                            placeholder="Menge" 
                            className="min-w-0"
                            {...field} 
                          />
                           {selectedIngredient && (
                            <span className="text-xs text-muted-foreground sm:whitespace-nowrap max-w-full truncate">
                              {selectedIngredient.unit}
                            </span>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          })}
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Speichert..." : (dish ? "Speichern" : "Gericht erstellen")}
        </Button>
      </form>
      
      {/* New Ingredient Dialog */}
      <Dialog open={newIngredientDialogOpen} onOpenChange={setNewIngredientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue Zutat erstellen</DialogTitle>
            <DialogDescription className="sr-only">
              Erstelle eine neue Zutat für dein Gericht.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ingredient-name">Name</Label>
              <Input
                id="ingredient-name"
                placeholder="z.B. Hackfleisch"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Einheit</Label>
              <Select value={newIngredientUnit} onValueChange={setNewIngredientUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Einheit wählen" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewIngredientDialogOpen(false)
                setNewIngredientName("")
                setNewIngredientUnit("")
                setNewIngredientForIndex(null)
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateIngredient}
              disabled={creatingIngredient || !newIngredientName.trim() || !newIngredientUnit.trim()}
            >
              {creatingIngredient ? "Erstellt..." : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
