import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CURRENCIES, CURRENCY_LABELS, convert, formatMoney, loadRates } from "@/lib/currency";
import { generateListingContent } from "@/lib/ai.functions";
import { Sparkles, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/image-compress";

export const Route = createFileRoute("/sell")({
  component: Sell,
});

function Sell() {
  const { user, loading: aLoad } = useAuth();
  const nav = useNavigate();
  const [cats, setCats] = useState<{ id: string; name_ar: string }[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    title: "", description: "", price: "", currency: "YER", category_id: "", city: "", image: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => { if (!aLoad && !user) nav({ to: "/auth" }); }, [aLoad, user, nav]);

  useEffect(() => {
    supabase.from("categories").select("id, name_ar").is("parent_id", null).order("sort_order")
      .then(({ data }) => {
        setCats(data ?? []);
        if (data?.[0]) setForm((f) => ({ ...f, category_id: data[0].id }));
      });
    loadRates().then(setRates);
  }, []);

  const priceNum = Number(form.price) || 0;

  async function aiAssist() {
    if (!form.description.trim()) return toast.error("اكتب وصفاً مختصراً أولاً ليساعدك الذكاء الاصطناعي");
    setAiBusy(true);
    try {
      const cat = cats.find((c) => c.id === form.category_id)?.name_ar;
      const res = await generateListingContent({ data: { description: form.description, category: cat } });
      setForm((f) => ({
        ...f,
        title: res.title || f.title,
        description: res.description || f.description,
      }));
      toast.success("تم تحسين الإعلان بالذكاء الاصطناعي ✨");
    } catch {
      toast.error("تعذر استدعاء المساعد الذكي");
    } finally {
      setAiBusy(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !user) return;
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const f of Array.from(files).slice(0, 6 - images.length)) {
        const compressed = await compressImage(f);
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${compressed.name}`;
        const { error } = await supabase.storage.from("listing-images").upload(path, compressed, { upsert: false, contentType: compressed.type });
        if (error) { toast.error(error.message); continue; }
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      if (urls.length) {
        setImages((prev) => [...prev, ...urls]);
        toast.success(`تم رفع ${urls.length} صورة بعد الضغط`);
      }
    } finally {
      setUploading(false);
    }
  }

  function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const allImages = [...images, ...(form.image ? [form.image] : [])];
    setSubmitting(true);
    const { data, error } = await supabase.from("listings").insert({
      user_id: user.id,
      category_id: form.category_id,
      title: form.title,
      description: form.description,
      price: priceNum,
      currency: form.currency,
      city: form.city || null,
      images: allImages,
    }).select("id").single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("تم نشر الإعلان");
    nav({ to: "/listing/$id", params: { id: data.id } });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-2xl px-4 py-8 w-full">
        <div className="glass rounded-3xl p-8">
          <h1 className="text-3xl font-black mb-6 text-gradient">نشر إعلان جديد</h1>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full h-12 rounded-md bg-input border border-border px-3">
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>عنوان الإعلان</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>الوصف</Label>
                <Button type="button" size="sm" variant="ghost" onClick={aiAssist} disabled={aiBusy} className="text-primary">
                  <Sparkles className="h-4 w-4" /> {aiBusy ? "..." : "تحسين بالذكاء الاصطناعي"}
                </Button>
              </div>
              <Textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>السعر</Label>
                <Input type="number" min="0" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-12" />
              </div>
              <div className="space-y-2">
                <Label>العملة</Label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full h-12 rounded-md bg-input border border-border px-2">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {priceNum > 0 && Object.keys(rates).length > 0 && (
              <div className="rounded-xl bg-secondary/50 p-3 text-sm">
                <div className="text-xs text-muted-foreground mb-1">يظهر للمشتري بكل العملات:</div>
                <div className="flex flex-wrap gap-2">
                  {CURRENCIES.filter((c) => c !== form.currency).map((c) => (
                    <span key={c} className="px-3 py-1 rounded-full bg-background">
                      {CURRENCY_LABELS[c]}: <strong>{formatMoney(convert(priceNum, form.currency, c, rates), c)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>المدينة</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>الصور (يتم ضغطها تلقائياً قبل الرفع)</Label>
              <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-secondary/40 transition">
                <Upload className="h-5 w-5" />
                <span className="text-sm">{uploading ? "جاري الضغط والرفع..." : "اختر صور المنتج (حتى 6)"}</span>
                <input type="file" accept="image/*" multiple className="hidden"
                  disabled={uploading || images.length >= 6}
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
              </label>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((u) => (
                    <div key={u} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
                      <img src={u} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(u)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">أو ألصق رابط صورة خارجي (اختياري)</Label>
              <Input type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="h-12" placeholder="https://..." />
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-12 bg-gradient-primary text-primary-foreground shadow-glow">
              {submitting ? "..." : "نشر الإعلان"}
            </Button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
