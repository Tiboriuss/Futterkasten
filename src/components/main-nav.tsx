import { cn } from "@/lib/utils"

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <a
        href="./"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Wochenplaner
      </a>
      <a
        href="/dishes"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Gerichte
      </a>
      <a
        href="/ingredients"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Zutaten
      </a>
      <a
        href="/shopping-list"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Einkaufsliste
      </a>
    </nav>
  )
}
