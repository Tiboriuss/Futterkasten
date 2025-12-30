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
import { dishSchema, DishFormValues } from "@/lib/validations/dish"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ingredient, Dish, DishIngredient } from "@prisma/client"
import { Check, ChevronsUpDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const COMMON_UNITS = [
  "g",
  "kg", 
  "ml",
  "l",
  "Stück",
  "Packung",
  "Becher",
  "Teelöffel",
  "TL",
  "Esslöffel",
  "EL",
  "Prise",
  "Bund",
  "Dose",
]

interface DishFormProps {
  availableIngredients: Ingredient[]
  dish?: Dish & { ingredients: (DishIngredient & { ingredient: Ingredient })[] }
  afterSave?: () => void
}

export function DishForm({ availableIngredients, dish, afterSave }: DishFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const defaultValues: DishFormValues = {
    name: dish?.name || "",
    description: dish?.description || "",
    suitableFor: (dish?.suitableFor as ("BREAKFAST" | "LUNCH" | "DINNER" | "SNACK")[]) || [],
    ingredients: dish?.ingredients.map((di: any) => ({
      ingredientName: di.ingredient.name,
      amount: di.amount,
      unit: di.unit,
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
        if (!dish) {
          form.reset({
            name: "",
            description: "",
            suitableFor: [],
            ingredients: [],
          })
        }
        router.refresh()
        if (afterSave) afterSave()
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
              <p className="text-xs text-muted-foreground mb-2">Hilft der AI bei Vorschlägen</p>
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
              onClick={() => append({ ingredientName: "", amount: 0, unit: "" })}
            >
              Zutat hinzufügen
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-start p-4 border rounded-lg">
              <FormField
                control={form.control}
                name={`ingredients.${index}.ingredientName`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="sr-only">Zutat</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-9",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || "Zutat wählen..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Zutat suchen oder neu eingeben..." 
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-2 text-sm">
                                <p className="text-muted-foreground mb-2">Keine Zutat gefunden.</p>
                                <p className="text-xs">Tippe weiter um eine neue Zutat zu erstellen: <span className="font-semibold">{field.value}</span></p>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {availableIngredients
                                .filter(ing => 
                                  ing.name.toLowerCase().includes(field.value?.toLowerCase() || "")
                                )
                                .map((ingredient) => (
                                  <CommandItem
                                    key={ingredient.id}
                                    value={ingredient.name}
                                    onSelect={() => {
                                      field.onChange(ingredient.name)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === ingredient.name ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {ingredient.name}
                                  </CommandItem>
                                ))}
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
                      <Input 
                        type="number" 
                        step="any" 
                        placeholder="Menge" 
                        className="h-9"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`ingredients.${index}.unit`}
                render={({ field }) => (
                  <FormItem className="w-full sm:w-32">
                    <FormLabel className="sr-only">Einheit</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-9",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || "Einheit..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Einheit eingeben..." 
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                          <CommandList>
                            <CommandEmpty>
                              <div className="p-2 text-xs text-muted-foreground">
                                Eigene Einheit: <span className="font-semibold">{field.value}</span>
                              </div>
                            </CommandEmpty>
                            <CommandGroup>
                              {COMMON_UNITS
                                .filter(unit => 
                                  unit.toLowerCase().includes(field.value?.toLowerCase() || "")
                                )
                                .map((unit) => (
                                  <CommandItem
                                    key={unit}
                                    value={unit}
                                    onSelect={() => field.onChange(unit)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === unit ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {unit}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Speichert..." : (dish ? "Gericht aktualisieren" : "Gericht erstellen")}
        </Button>
      </form>
    </Form>
  )
}
