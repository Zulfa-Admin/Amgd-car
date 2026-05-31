import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { PriceDisplay } from "@/components/PriceDisplay";
import { Heart, MapPin, MessageSquare, Trash2, Gavel, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { ChatBox } from "@/components/ChatBox";

export const Route = createFileRoute("/listing/$id")({
  component: ListingDetail,
});

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [l, setL] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [fav, setFav] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
      setL(data);
      if (data) {
        const { data: p } = await supabase.from("profiles").select("id, full_name, username, avatar_url, city")
          .eq("id", data.user_id).maybeSingle();
        setSeller(p);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !l) return;
    supabase.from("favorites").select("user_id").eq("user_id", user.id).eq("listing_id", l.id).maybeSingle()
      .then(({ data }) => setFav(!!data));
  }, [user, l]);

  async function toggleFav() {
    if (!user) return nav({ to: "/auth" });
    if (fav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", l.id);
      setFav(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: l.id });
      setFav(true);
    }
  }

  async function openDealChat() {
    if (!user) return nav({ to: "/auth" });
    if (user.id === l.user_id) return;
    const { data: existing } = await supabase.from("conversations").select("id")
      .eq("listing_id", l.id).eq("buyer_id", user.id).eq("seller_id", l.user_id).maybeSingle();
    let convId = existing?.id;
    if (!convId) {
      const { data, error } = await supabase.from("conversations")
        .insert({ listing_id: l.id, buyer_id: user.id, seller_id: l.user_id }).select("id").single();
      if (error) {
        return toast.error("شات الصفقة الخاص يُفتح فقط للفائز بالمزاد أو بعد إتمام صفقة. استخدم شات الإعلان أدناه.");
      }
      convId = data.id;
    }
    nav({ to: "/messages/$id", params: { id: convId! } });
  }

  async function remove() {
    if (!confirm("حذف هذا الإعلان؟")) return;
    const { error } = await supabase.from("listings").delete().eq("id", l.id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    nav({ to: "/browse" });
  }

  if (loading) return <div className="min-h-screen"><SiteHeader /><div className="text-center py-20 text-muted-foreground">...</div></div>;
  if (!l) return <div className="min-h-screen"><SiteHeader /><div className="text-center py-20">الإعلان غير موجود</div></div>;

  const isOwner = user?.id === l.user_id;
  const sellerAlias = `Zulfa-User-${(l.user_id as string).slice(0, 6).toUpperCase()}`;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 py-8 w-full">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="glass rounded-3xl overflow-hidden aspect-square">
            {l.images?.[0] ? (
              <img src={l.images[0]} alt={l.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted-foreground">لا توجد صورة</div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass rounded-3xl p-6">
              <h1 className="text-3xl font-black mb-3">{l.title}</h1>
              <PriceDisplay amount={Number(l.price)} currency={l.currency} size="lg" />
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-4">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{l.city ?? "—"}</span>
                <span>•</span>
                <span>{timeAgo(l.created_at)}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-green-600"><ShieldCheck className="h-4 w-4" /> محمي بالضمان</span>
              </div>
              <p className="mt-5 text-foreground/90 leading-relaxed whitespace-pre-wrap">{l.description}</p>
            </div>

            <div className="glass rounded-3xl p-5 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-primary grid place-items-center font-black text-primary-foreground text-xs">ز</div>
              <div className="flex-1">
                <div className="font-bold" dir="ltr">{sellerAlias}</div>
                <div className="text-xs text-muted-foreground">🔒 الهوية محمية حتى تأكيد الصفقة عبر نظام الضمان</div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isOwner && (
                <>
                  <Button onClick={openDealChat} variant="outline" className="flex-1 h-12">
                    <Lock className="h-4 w-4" /> شات الصفقة الخاص
                  </Button>
                  <Button onClick={toggleFav} variant="outline" className="h-12 px-4">
                    <Heart className={`h-4 w-4 ${fav ? "fill-accent text-accent" : ""}`} />
                  </Button>
                </>
              )}
              {isOwner && (
                <>
                  <Button asChild className="flex-1 h-12 bg-gradient-primary text-primary-foreground shadow-glow">
                    <Link to="/auctions/new/$listingId" params={{ listingId: l.id }}>
                      <Gavel className="h-4 w-4" /> ابدأ مزاد
                    </Link>
                  </Button>
                  <Button onClick={remove} variant="outline" className="h-12 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <Link to="/browse" className="block text-center text-sm text-muted-foreground hover:text-foreground">← عودة للتصفح</Link>
          </div>
        </div>

        {/* Layer 2: Public Q&A on the listing */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-xl font-black">أسئلة وردود حول الإعلان</h2>
            <span className="text-xs text-muted-foreground">(عام — يراه الجميع)</span>
          </div>
          <ChatBox
            table="listing_messages"
            filter={{ col: "listing_id", val: l.id }}
            insertPayload={(userId, body) => ({ listing_id: l.id, user_id: userId, body })}
            maxLen={500}
            title={`💬 محادثة الإعلان: ${l.title}`}
            emptyHint="لا أسئلة بعد. اسأل البائع علناً وكن أول مهتم!"
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
