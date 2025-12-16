import { z } from "zod"

export const ingredientSchema = z.object({
  name: z.string().min(2, {
    message: "Name muss mindestens 2 Zeichen lang sein.",
  }),
  unit: z.string().min(1, {
    message: "Einheit ist erforderlich.",
  }),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>
