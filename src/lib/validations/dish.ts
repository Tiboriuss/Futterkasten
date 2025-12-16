import { z } from "zod"

export const dishSchema = z.object({
  name: z.string().min(2, {
    message: "Name muss mindestens 2 Zeichen lang sein.",
  }),
  description: z.string().optional(),
  suitableFor: z.array(z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"])).default([]),
  ingredients: z.array(
    z.object({
      ingredientId: z.string().min(1, "Zutat ist erforderlich"),
      amount: z.coerce.number().min(0.1, "Menge muss größer als 0 sein"),
    })
  ).default([]),
})

export type DishFormValues = z.infer<typeof dishSchema>
