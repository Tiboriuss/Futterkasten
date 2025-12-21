"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createIngredient, updateIngredient } from "@/app/actions/ingredients"
import { ingredientSchema, IngredientFormValues } from "@/lib/validations/ingredient"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Ingredient } from "@prisma/client"

const units = [
  { label: "Gramm (g)", value: "g" },
  { label: "Milliliter (ml)", value: "ml" },
  { label: "Becher", value: "Becher" },
  { label: "Teelöffel", value: "Teelöffel" },
  { label: "Esslöffel", value: "Esslöffel" },
  { label: "Stück", value: "Stück" },
  { label: "Packung", value: "Packung" },
]

interface IngredientFormProps {
  ingredient?: Ingredient
  afterSave?: () => void
}

export function IngredientForm({ ingredient, afterSave }: IngredientFormProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: {
      name: ingredient?.name || "",
      unit: ingredient?.unit || "g",
    },
  })

  // Reset form when ingredient prop changes (e.g. opening different edit dialogs)
  useEffect(() => {
    if (ingredient) {
      form.reset({
        name: ingredient.name,
        unit: ingredient.unit,
      })
    }
  }, [ingredient, form])

  async function onSubmit(data: IngredientFormValues) {
    setLoading(true)
    let result
    
    if (ingredient) {
        result = await updateIngredient(ingredient.id, data)
    } else {
        result = await createIngredient(data)
    }
    
    setLoading(false)

    if (result.success) {
      if (!ingredient) {
          form.reset()
      }
      router.refresh()
      if (afterSave) {
          afterSave()
      }
    } else {
      console.error(result.error)
      // Ideally show toast error here
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Mehl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Einheit</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wähle eine Einheit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Speichert..." : (ingredient ? "Speichern" : "Hinzufügen")}
        </Button>
      </form>
    </Form>
  )
}
