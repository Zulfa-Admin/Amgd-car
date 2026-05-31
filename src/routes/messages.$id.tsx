import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export const Route = createFileRoute("/messages/$id")({
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [conv, setConv] = useState<any>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("conversations").select("*, listing:listings(id, title)").eq("id", id).maybeSingle()
      .then(({ data }) => setConv(data));
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at")
      .then(({ data }) => setMsgs(data ?? []));

    const channel = supabase.channel(`msg-${id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => setMsgs((m) => [...m, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const body = text.trim();
    setText("");
    await supabase.from("messages").insert({ conversation_id: id, sender_id: user.id, body });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", id);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto max-w-3xl w-full px-4 py-4 flex-1 flex flex-col">
        <div className="glass rounded-2xl p-4 mb-3">
          <Link to="/messages" className="text-xs text-muted-foreground">← الرسائل</Link>
          {conv?.listing && (
            <Link to="/listing/$id" params={{ id: conv.listing.id }} className="block font-bold mt-1">{conv.listing.title}</Link>
          )}
        </div>

        <div className="flex-1 glass rounded-3xl p-4 overflow-y-auto space-y-2 min-h-[400px] max-h-[60vh]">
          {msgs.map((m) => {
            const me = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${me ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${me ? "bg-gradient-primary text-primary-foreground" : "bg-secondary"}`}>
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="flex gap-2 mt-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة..." className="h-12" />
          <Button type="submit" className="h-12 bg-gradient-primary text-primary-foreground shadow-glow">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
