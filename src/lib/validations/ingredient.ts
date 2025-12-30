import { z } from "zod"

export const ingredientSchema = z.object({
  name: z.string().min(2, {
    message: "Name muss mindestens 2 Zeichen lang sein.",
  }),
})

export type IngredientFormValues = z.infer<typeof ingredientSchema>
