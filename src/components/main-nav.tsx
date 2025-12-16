"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { useBasePath } from "@/lib/use-base-path"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const basePath = useBasePath()
  
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href={`${basePath}/`}
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Wochenplaner
      </Link>
      <Link
        href={`${basePath}/dishes`}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Gerichte
      </Link>
      <Link
        href={`${basePath}/ingredients`}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Zutaten
      </Link>
      <Link
        href={`${basePath}/shopping-list`}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Einkaufsliste
      </Link>
    </nav>
  )
}
