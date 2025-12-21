import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { startOfDay, endOfDay } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate query parameters are required (ISO format)" },
        { status: 400 }
      )
    }

    const startDate = startOfDay(new Date(startDateParam))
    const endDate = endOfDay(new Date(endDateParam))

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO format (e.g., 2024-01-15)" },
        { status: 400 }
      )
    }

    const meals = await db.meal.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        dish: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: "asc" },
        { type: "asc" },
      ],
    })

    return NextResponse.json({
      success: true,
      data: meals,
      meta: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        count: meals.length,
      },
    })
  } catch (error) {
    console.error("Error fetching meals:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
