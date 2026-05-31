import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, ShieldAlert, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

type Msg = { id: string; user_id: string; body: string; created_at: string };

export function ChatBox({
  table,
  filter,
  insertPayload,
  maxLen,
  title,
  emptyHint,
  height = "h-[420px]",
}: {
  table: "plaza_messages" | "listing_messages";
  filter?: { col: string; val: string };
  insertPayload: (userId: string, body: string) => Record<string, any>;
  maxLen: number;
  title: string;
  emptyHint: string;
  height?: string;
}) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name?: string; username?: string }>>({});
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    let q = supabase.from(table).select("id, user_id, body, created_at").order("created_at", { ascending: true }).limit(200);
    if (filter) q = q.eq(filter.col, filter.val);
    const { data } = await q;
    const list = (data ?? []) as Msg[];
    setMsgs(list);
    const ids = Array.from(new Set(list.map((m) => m.user_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
      const map: Record<string, any> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  }

  useEffect(() => {
    load();
    const channelName = `${table}-${filter?.val ?? "all"}`;
    const ch = supabase.channel(channelName)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table, ...(filter ? { filter: `${filter.col}=eq.${filter.val}` } : {}) },
        () => load())
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter?.val]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !body.trim()) return;
    setSending(true);
    const payload = insertPayload(user.id, body.trim().slice(0, maxLen));
    const { error } = await supabase.from(table).insert(payload);
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
  }

  async function remove(id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="glass rounded-3xl p-4 sm:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black">{title}</h3>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" /> الأرقام والروابط محظورة تلقائياً
        </span>
      </div>
      <div ref={scrollRef} className={`${height} overflow-y-auto space-y-2 pr-1`}>
        {msgs.length === 0 && <div className="text-center text-sm text-muted-foreground py-10">{emptyHint}</div>}
        {msgs.map((m) => {
          const p = profiles[m.user_id];
          const name = p?.full_name || p?.username || `Zulfa-User-${m.user_id.slice(0, 6).toUpperCase()}`;
          const mine = user?.id === m.user_id;
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-primary grid place-items-center text-xs font-black text-primary-foreground">
                {name[0]}
              </div>
              <div className={`group max-w-[78%] rounded-2xl px-3 py-2 ${mine ? "bg-gradient-primary/15 border border-primary/20" : "bg-muted/50"}`}>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-0.5">
                  <Link to="/profile/$id" params={{ id: m.user_id }} className="font-bold hover:text-foreground">{name}</Link>
                  <span>•</span>
                  <span>{timeAgo(m.created_at)}</span>
                  {mine && (
                    <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 transition">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
              </div>
            </div>
          );
        })}
      </div>

      {user ? (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="اكتب رسالتك..."
            maxLength={maxLen}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !body.trim()} className="bg-gradient-primary text-primary-foreground shadow-glow">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <div className="mt-3 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary font-bold hover:underline">سجل دخولك</Link> للمشاركة في المحادثة
        </div>
      )}
    </div>
  );
}
