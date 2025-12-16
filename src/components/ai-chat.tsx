"use client"

import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, X, Send, Bot, User, Loader2, CheckCircle2, AlertCircle, PlayCircle } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import ReactMarkdown, { Components } from "react-markdown"
import { useBasePath } from "@/lib/use-base-path"

// Tool name translations
const toolNameLabels: Record<string, string> = {
  getCurrentDateTime: "Datum abrufen",
  listDishes: "Gerichte laden",
  getDishByName: "Gericht suchen",
  getTodaysMeals: "Heutige Mahlzeiten",
  getWeekMeals: "Wochenplan laden",
  listIngredients: "Zutaten laden",
  getMealHistory: "Verlauf laden",
  addMealToPlan: "Mahlzeit hinzufügen",
  addMultipleMeals: "Mahlzeiten hinzufügen",
  getMealByDateAndType: "Mahlzeit suchen",
  previewRemoveMeal: "Löschvorschau",
  removeMeal: "Mahlzeit löschen",
  previewRemoveMultipleMeals: "Mehrfach-Löschvorschau",
  removeMultipleMeals: "Mahlzeiten löschen",
  moveMeal: "Mahlzeit verschieben",
  swapMeals: "Mahlzeiten tauschen",
}

export function AIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const [hasRefreshed, setHasRefreshed] = useState<Set<string>>(new Set())
  const chat = useChat({
    onError: (error) => console.error("Chat error:", error),
  }) as any
  
  // Destructure available properties. fallback to safe defaults.
  const { messages = [], sendMessage, status } = chat
  
  // Derive isLoading from status if available, otherwise fallback to false
  const isLoading = status === "submitted" || status === "streaming"

  const basePath = useBasePath()
  
  // Custom markdown components to handle link rewriting
  const markdownComponents: Components = {
    a: ({ node, href, ...props }) => {
      const isInternal = href?.startsWith("/")
      const finalHref = isInternal ? `${basePath}${href}` : href
      return <a href={finalHref} {...props} target={isInternal ? undefined : "_blank"} rel={isInternal ? undefined : "noopener noreferrer"} />
    }
  }

  const [input, setInput] = useState<string>("")
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Check for [REFRESH] marker in tool outputs and trigger router.refresh()
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== 'assistant') continue
      for (const part of message.parts || []) {
        if (part.type?.startsWith('tool-') && part.state === 'output-available') {
          const output = typeof part.output === 'string' ? part.output : JSON.stringify(part.output)
          if (output?.includes('[REFRESH]') && !hasRefreshed.has(part.toolCallId)) {
            setHasRefreshed(prev => new Set(prev).add(part.toolCallId))
            // Small delay to let the AI finish responding
            setTimeout(() => {
              router.refresh()
            }, 500)
          }
        }
      }
    }
  }, [messages, router, hasRefreshed])
  
  // Check if AI stopped mid-task (has tool calls but no text response and not loading)
  const lastMessage = messages[messages.length - 1]
  const hasIncompleteToolCalls = lastMessage?.role === 'assistant' && 
    lastMessage?.parts?.some((p: any) => p.type?.startsWith('tool-') && p.state === 'output-available') &&
    !lastMessage?.parts?.some((p: any) => p.type === 'text' && p.text?.trim())
  const canContinue = !isLoading && hasIncompleteToolCalls
  
  const handleContinue = async () => {
    try {
      if (typeof sendMessage === 'function') {
        await sendMessage({ text: "Bitte fahre fort und beantworte meine ursprüngliche Frage." })
      }
    } catch (err) {
      console.error("Failed to continue:", err)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const safeInput = input || ""
    if (!safeInput.trim()) return

    // Clear input immediately for better UX
    setInput('')

    try {
      if (typeof sendMessage === 'function') {
        await sendMessage({ text: safeInput })
      } else {
        console.error("Chat 'sendMessage' function is missing", chat)
        alert("Fehler: Chat-Funktion nicht verfügbar.")
        setInput(safeInput) // Restore input on error
      }
    } catch (err) {
      console.error("Failed to send message:", err)
      alert("Nachricht konnte nicht gesendet werden.")
      setInput(safeInput) // Restore input on error
    }
  }

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-4 right-4 z-50 w-[400px] bg-background border rounded-lg shadow-xl transition-all duration-300 ease-in-out transform",
          isOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-[120%] opacity-0 pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm">Mampf Bot</h3>
              <p className="text-xs text-muted-foreground">Powered by Tibor AI</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-[400px] p-4 overflow-y-auto" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 gap-2">
                <Bot className="h-10 w-10 opacity-20" />
                <p className="text-sm">Hallo! Ich kann dir beim Planen helfen, deine Zutaten prüfen oder Rezepte vorschlagen.</p>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((m: any) => {
              const textParts = m.parts?.filter((p: any) => p.type === 'text') || []
              const toolParts = m.parts?.filter((p: any) => p.type?.startsWith('tool-')) || []
              const textContent = textParts.map((p: any) => p.text).join('') || m.content || ''
              
              // For assistant messages, render text and tool status separately
              if (m.role === 'assistant') {
                const hasContent = textContent || toolParts.length > 0
                if (!hasContent) return null
                
                return (
                  <div key={m.id} className="flex gap-3 text-sm flex-row">
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm bg-muted">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      {/* Tool calls indicator */}
                      {toolParts.length > 0 && (
                        <div className="flex flex-col gap-1">
                          {toolParts.map((part: any, idx: number) => {
                            const toolName = part.type.replace('tool-', '')
                            const label = toolNameLabels[toolName] || toolName
                            const state = part.state
                            
                            return (
                              <div 
                                key={`${m.id}-tool-${idx}`}
                                className={cn(
                                  "flex items-center gap-2 text-xs px-2 py-1 rounded-md",
                                  state === 'output-available' ? "bg-green-500/10 text-green-600 dark:text-green-400" :
                                  state === 'output-error' ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                                  "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                )}
                              >
                                {state === 'output-available' ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : state === 'output-error' ? (
                                  <AlertCircle className="h-3 w-3" />
                                ) : (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                )}
                                <span>{label}</span>
                                {state === 'input-streaming' && <span className="opacity-60">...</span>}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      {/* Text content */}
                      {textContent && (
                        <div className="rounded-lg px-3 py-2 bg-muted">
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_p]:my-1">
                            <ReactMarkdown components={markdownComponents}>
                              {textContent}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              
              // User messages
              return (
                <div
                  key={m.id}
                  className="flex gap-3 text-sm flex-row-reverse"
                >
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="rounded-lg px-3 py-2 max-w-[80%] bg-primary text-primary-foreground">
                    {textContent}
                  </div>
                </div>
              )
            })}
            
            {isLoading && !messages.some((m: any) => m.role === 'assistant' && m.parts?.some((p: any) => p.type?.startsWith('tool-') && p.state !== 'output-available')) && (
                 <div className="flex gap-3 text-sm flex-row">
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm bg-muted">
                        <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-muted text-muted-foreground italic flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Denkt nach...
                    </div>
                 </div>
            )}
            
            {/* Continue button when AI stopped mid-task */}
            {canContinue && (
                 <div className="flex gap-3 text-sm flex-row">
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm bg-muted">
                        <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="rounded-lg px-3 py-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">
                        AI hat das Limit erreicht und wartet auf Fortsetzung.
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleContinue}
                        className="w-fit"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Weiter arbeiten
                      </Button>
                    </div>
                 </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t">
          <form 
            onSubmit={handleSend} 
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Frag nach den Mampf Bot..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  )
}
