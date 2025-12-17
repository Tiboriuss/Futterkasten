"use client"

import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"

export function MobileNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("", className)}
          {...props}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menü öffnen</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetTitle className="text-left mb-6">
          🥪 Futterkasten
        </SheetTitle>
        <nav className="flex flex-col space-y-4">
          <a
            href="./"
            onClick={() => setOpen(false)}
            className="text-lg font-medium transition-colors hover:text-primary py-2"
          >
            Wochenplaner
          </a>
          <a
            href="/dishes"
            onClick={() => setOpen(false)}
            className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary py-2"
          >
            Gerichte
          </a>
          <a
            href="/ingredients"
            onClick={() => setOpen(false)}
            className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary py-2"
          >
            Zutaten
          </a>
          <a
            href="/shopping-list"
            onClick={() => setOpen(false)}
            className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary py-2"
          >
            Einkaufsliste
          </a>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
