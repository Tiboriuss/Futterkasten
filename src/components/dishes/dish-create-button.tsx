"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DishForm } from "./dish-form"
import { Ingredient } from "@prisma/client"
import { Plus } from "lucide-react"
import { useState } from "react"

interface DishCreateButtonProps {
  availableIngredients: Ingredient[]
}

export function DishCreateButton({ availableIngredients }: DishCreateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Neues Gericht
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Gericht erstellen</DialogTitle>
          <DialogDescription className="sr-only">
            Fülle das Formular aus, um ein neues Gericht zu erstellen.
          </DialogDescription>
        </DialogHeader>
        <DishForm 
          availableIngredients={availableIngredients} 
          afterSave={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  )
}
