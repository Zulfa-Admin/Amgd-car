import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, timeAgo } from "@/lib/format";
import { formatCountdown } from "@/lib/countdown";
import { Gavel, Clock, TrendingUp, MapPin, Trophy, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auction/$id")({
  component: AuctionDetail,
});

function AuctionDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [a, setA] = useState<any>(null);
  const [listing, setListing] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [bidders, setBidders] = useState<Record<string, any>>({});
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  async function loadAll() {
    const { data: au } = await supabase.from("auctions").select("*").eq("id", id).maybeSingle();
    setA(au);
    if (au) {
      const { data: l } = await supabase.from("listings").select("*").eq("id", au.listing_id).maybeSingle();
      setListing(l);
    }
    const { data: bs } = await supabase.from("bids").select("*").eq("auction_id", id).order("created_at", { ascending: false }).limit(50);
    setBids(bs ?? []);
    const ids = Array.from(new Set((bs ?? []).map((b: any) => b.bidder_id)));
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, username").in("id", ids);
      const map: Record<string, any> = {};
      (ps ?? []).forEach((p: any) => { map[p.id] = p; });
      setBidders(map);
    }
  }

  useEffect(() => {
    loadAll();
    const ch = supabase.channel(`auction-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bids", filter: `auction_id=eq.${id}` }, () => loadAll())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${id}` }, (p) => setA(p.new))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    if (!user) { setKycStatus(null); return; }
    supabase.from("profiles").select("kyc_status").eq("id", user.id).maybeSingle()
      .then(({ data }) => setKycStatus(data?.kyc_status ?? "unverified"));
  }, [user?.id]);

  async function placeBid(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return nav({ to: "/auth" });
    const amt = Number(amount);
    if (!amt || amt < Number(a.current_price) + Number(a.bid_increment)) {
      toast.error("يجب أن تكون المزايدة ≥ السعر الحالي + حد الزيادة");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("place_bid", { _auction_id: id, _amount: amt });
    setSubmitting(false);
    if (error) {
      if (error.message.includes("KYC_REQUIRED")) {
        toast.error("يجب توثيق هويتك قبل المزايدة. توجّه إلى المحفظة لرفع وثيقة الهوية.");
        return nav({ to: "/wallet" });
      }
      return toast.error(error.message);
    }
    toast.success("✅ تم تسجيل مزايدتك وتجميد المبلغ في محفظتك");
    setAmount("");
  }

  if (!a) return <div className="min-h-screen"><SiteHeader /><div className="text-center py-20 text-muted-foreground">جاري التحميل...</div></div>;

  const cd = formatCountdown(a.ends_at);
  const minNext = Number(a.current_price) + Number(a.bid_increment);
  const isSeller = user?.id === a.seller_id;
  const commission = Number(a.current_price) * Number(a.commission_rate);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <Link to="/auctions" className="text-sm text-muted-foreground hover:text-foreground">← كل المزادات</Link>

        <div className="grid lg:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div className="glass rounded-3xl overflow-hidden aspect-video">
              {listing?.images?.[0] ? (
                <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center"><Gavel className="h-16 w-16 text-muted-foreground" /></div>
              )}
            </div>
            <div className="glass rounded-3xl p-6">
              <h1 className="text-2xl font-black mb-2">{listing?.title}</h1>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{listing?.city ?? "—"}</span>
              </div>
              <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{listing?.description}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">السعر الحالي</span>
                <span className={`flex items-center gap-1 text-sm ${cd.ended ? "text-destructive" : "text-accent"}`}>
                  <Clock className="h-4 w-4" /> {cd.text}
                </span>
              </div>
              <div className="text-5xl font-black text-gradient mb-2">{formatPrice(a.current_price, a.currency)}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {a.bid_count} مزايدة</span>
                <span>•</span>
                <span>الافتتاح: {formatPrice(a.start_price, a.currency)}</span>
              </div>

              {!cd.ended && a.status === "active" && !isSeller && (
                <form onSubmit={placeBid} className="mt-5 space-y-2">
                  <div className="text-xs text-muted-foreground">أقل مزايدة مقبولة: <span className="font-bold text-foreground">{formatPrice(minNext, a.currency)}</span></div>
                  {user && kycStatus && kycStatus !== "verified" && (
                    <button type="button" onClick={() => nav({ to: "/wallet" })}
                      className="w-full flex items-center gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-right">
                      <ShieldAlert className="h-5 w-5 text-yellow-600 shrink-0" />
                      <div className="flex-1 text-sm">
                        <div className="font-bold text-yellow-700">مطلوب توثيق الهوية (KYC)</div>
                        <div className="text-xs text-muted-foreground">اضغط هنا لرفع وثيقة الهوية قبل المزايدة.</div>
                      </div>
                    </button>
                  )}
                  <div className="flex gap-2">
                    <Input type="number" min={minNext} step={a.bid_increment} value={amount}
                      onChange={(e) => setAmount(e.target.value)} placeholder={String(minNext)} className="h-12 text-lg"
                      disabled={!!user && kycStatus !== "verified" && kycStatus !== null} />
                    <Button type="submit" disabled={submitting || (!!user && kycStatus !== "verified" && kycStatus !== null)}
                      className="h-12 px-6 bg-gradient-primary text-primary-foreground shadow-glow">
                      {user && kycStatus && kycStatus !== "verified"
                        ? (<><ShieldAlert className="h-4 w-4" /> توثيق مطلوب</>)
                        : (<><Gavel className="h-4 w-4" /> زايد</>)}
                    </Button>
                  </div>
                  {!user && <div className="text-xs text-muted-foreground">يجب تسجيل الدخول للمزايدة.</div>}
                </form>
              )}
              {isSeller && <div className="mt-5 text-xs text-muted-foreground">أنت مالك هذا المزاد ولا يمكنك المزايدة.</div>}
              {(cd.ended || a.status !== "active") && a.winner_id && (
                <div className="mt-5 p-4 rounded-2xl bg-gradient-primary/10 border border-primary/20 flex items-center gap-3">
                  <Trophy className="h-5 w-5 text-accent" />
                  <div className="text-sm">
                    <div className="font-bold" dir="ltr">الفائز: Zulfa-User-{a.winner_id.slice(0,6).toUpperCase()}</div>
                    <div className="text-xs text-muted-foreground">عمولة المنصة (5%): {formatPrice(commission, a.currency)}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-3xl p-6">
              <h3 className="font-black mb-4">سجل المزايدات</h3>
              <p className="text-[10px] text-muted-foreground mb-2">🔒 الهويات مخفية لحماية الخصوصية حتى نهاية المزاد</p>
              {bids.length === 0 && <div className="text-sm text-muted-foreground">لا توجد مزايدات بعد. كن أول من يزايد!</div>}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {bids.map((b, i) => {
                  const top = i === 0;
                  const alias = `Zulfa-User-${b.bidder_id.slice(0,6).toUpperCase()}`;
                  const isMe = user?.id === b.bidder_id;
                  return (
                    <div key={b.id} className={`flex items-center justify-between p-3 rounded-xl ${top ? "bg-gradient-primary/10 border border-primary/20" : "bg-muted/30"}`}>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-primary grid place-items-center text-xs font-black text-primary-foreground">
                          {alias[6]}
                        </div>
                        <div className="text-sm">
                          <div className="font-bold" dir="ltr">{isMe ? "أنت" : alias}</div>
                          <div className="text-xs text-muted-foreground">{timeAgo(b.created_at)}</div>
                        </div>
                      </div>
                      <div className={`font-black ${top ? "text-gradient" : ""}`}>{formatPrice(b.amount, a.currency)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
