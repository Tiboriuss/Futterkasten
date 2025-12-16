import { MainNav } from "@/components/main-nav"
import { ModeToggle } from "@/components/mode-toggle"

export default function Header() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center gap-2 font-bold text-xl mr-4">
          🥪 Futterkasten
        </div>
        <MainNav className="mx-6" />
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
        </div>
      </div>
    </div>
  )
}
