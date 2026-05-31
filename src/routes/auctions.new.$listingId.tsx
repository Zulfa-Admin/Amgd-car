import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gavel } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auctions/new/$listingId")({
  component: NewAuction,
});

function NewAuction() {
  const { listingId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [listing, setListing] = useState<any>(null);
  const [startPrice, setStartPrice] = useState("");
  const [increment, setIncrement] = useState("50");
  const [hours, setHours] = useState("24");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/auth" }); return; }
    (async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", listingId).maybeSingle();
      if (!data) { toast.error("الإعلان غير موجود"); nav({ to: "/browse" }); return; }
      if (data.user_id !== user.id) { toast.error("غير مصرح"); nav({ to: "/listing/$id", params: { id: listingId } }); return; }
      const { data: existing } = await supabase.from("auctions").select("id").eq("listing_id", listingId).maybeSingle();
      if (existing) { nav({ to: "/auction/$id", params: { id: existing.id } }); return; }
      setListing(data);
      setStartPrice(String(data.price || 0));
    })();
  }, [user, loading, listingId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !listing) return;
    setSubmitting(true);
    const sp = Number(startPrice);
    const ends = new Date(Date.now() + Number(hours) * 3600_000).toISOString();
    const { data, error } = await supabase.from("auctions").insert({
      listing_id: listing.id,
      seller_id: user.id,
      category_id: listing.category_id,
      start_price: sp,
      current_price: sp,
      bid_increment: Number(increment),
      currency: listing.currency,
      ends_at: ends,
      status: "active",
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء المزاد");
    nav({ to: "/auction/$id", params: { id: data.id } });
  }

  if (!listing) return <div className="min-h-screen"><SiteHeader /><div className="text-center py-20 text-muted-foreground">...</div></div>;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
        <Link to="/listing/$id" params={{ id: listingId }} className="text-sm text-muted-foreground hover:text-foreground">← عودة للإعلان</Link>
        <div className="glass rounded-3xl p-8 mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
              <Gavel className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black">إنشاء مزاد</h1>
              <p className="text-sm text-muted-foreground">{listing.title}</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>سعر الافتتاح ({listing.currency})</Label>
              <Input type="number" min={0} value={startPrice} onChange={(e) => setStartPrice(e.target.value)} required className="h-11 mt-1" />
            </div>
            <div>
              <Label>الحد الأدنى للزيادة</Label>
              <Input type="number" min={1} value={increment} onChange={(e) => setIncrement(e.target.value)} required className="h-11 mt-1" />
            </div>
            <div>
              <Label>مدة المزاد (ساعات)</Label>
              <Input type="number" min={1} max={720} value={hours} onChange={(e) => setHours(e.target.value)} required className="h-11 mt-1" />
            </div>
            <div className="text-xs text-muted-foreground p-3 rounded-xl bg-muted/30">
              عند نجاح المزاد، تستقطع المنصة عمولة 5% من السعر النهائي.
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 bg-gradient-primary text-primary-foreground shadow-glow">
              {submitting ? "جاري..." : "ابدأ المزاد"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
