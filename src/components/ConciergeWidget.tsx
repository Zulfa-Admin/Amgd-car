import { useState } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { conciergeChat } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

export function ConciergeWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "مرحباً 👋 أنا مساعد زُلفى. كيف أقدر أساعدك اليوم؟" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const res = await conciergeChat({ data: { messages: next.slice(-10) } });
      setMsgs((m) => [...m, { role: "assistant", content: res.text }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: "assistant", content: "تعذر الاتصال بالمساعد حالياً. حاول مرة أخرى." }]);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="افتح المساعد الذكي"
        className="fixed bottom-5 right-5 z-50 h-14 px-5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow flex items-center gap-2 hover:scale-105 transition-transform"
      >
        <Bot className="h-5 w-5" />
        <span className="font-bold text-sm">مساعد زُلفى</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] max-h-[70vh] flex flex-col rounded-3xl glass shadow-glow overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gradient-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="font-bold">مساعد زُلفى الذكي</span>
        </div>
        <button onClick={() => setOpen(false)} aria-label="إغلاق"><X className="h-5 w-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/60">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-bl-sm"
                : "bg-secondary text-foreground rounded-br-sm"
            }`}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="text-xs text-muted-foreground text-center">يكتب...</div>}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-center gap-2 p-3 border-t border-border bg-background"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب سؤالك..."
          className="flex-1 h-11 rounded-full bg-secondary px-4 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()} size="icon" className="h-11 w-11 rounded-full bg-gradient-primary">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
