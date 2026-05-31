import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CURRENCIES, CURRENCY_LABELS, formatMoney } from "@/lib/currency";
import { toast } from "sonner";
import { Wallet as WalletIcon, ArrowDownToLine, Upload, ShieldCheck } from "lucide-react";
import { compressImage } from "@/lib/image-compress";
import { KycUploader } from "@/components/KycUploader";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
});

const GATEWAYS = [
  "كريمي إكسبرس",
  "جوالي",
  "جيب",
  "حوالات النجم",
  "حوالات الحزمي",
  "بنك التسليف",
  "تحويل بنكي آخر",
];

const GATEWAY_NUMBERS: Record<string, string> = {
  "كريمي إكسبرس": "771068888",
  "جوالي": "771068888",
  "جيب": "771068888",
  "حوالات النجم": "739988888",
  "حوالات الحزمي": "739988888",
};

function WalletPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [wallets, setWallets] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ amount: "", currency: "YER", gateway: GATEWAYS[0], reference: "" });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && !user) nav({ to: "/auth" }); }, [user, loading, nav]);

  async function load() {
    if (!user) return;
    const [w, l, d, p] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("manual_deposits").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("profiles").select("kyc_status, commission_exempt").eq("id", user.id).maybeSingle(),
    ]);
    setWallets(w.data ?? []);
    setLedger(l.data ?? []);
    setDeposits(d.data ?? []);
    setProfile(p.data);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  async function submitDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      let proof_url: string | null = null;
      if (proofFile) {
        const compressed = await compressImage(proofFile, { maxSizeMB: 0.6, maxWidthOrHeight: 1600 });
        const path = `${user.id}/${Date.now()}-proof.${(compressed.name.split(".").pop() || "jpg").toLowerCase()}`;
        const { error: upErr } = await supabase.storage.from("deposit-proofs").upload(path, compressed);
        if (upErr) throw upErr;
        proof_url = path;
      }
      const { error } = await supabase.from("manual_deposits").insert({
        user_id: user.id,
        amount: Number(form.amount),
        currency: form.currency,
        gateway: form.gateway,
        reference: form.reference || null,
        proof_url,
      });
      if (error) throw error;
      toast.success("تم إرسال طلب الإيداع مع إثبات الدفع. سيتم تأكيده يدوياً من الإدارة");
      setForm({ ...form, amount: "", reference: "" });
      setProofFile(null);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) return <div className="min-h-screen"><SiteHeader /></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 py-8 w-full space-y-6">
        <h1 className="text-3xl font-black text-gradient flex items-center gap-2">
          <WalletIcon className="h-7 w-7" /> محفظتي
        </h1>

        <div className="grid sm:grid-cols-3 gap-4">
          {CURRENCIES.map((c) => {
            const w = wallets.find((x) => x.currency === c);
            return (
              <div key={c} className="glass rounded-3xl p-5">
                <div className="text-xs text-muted-foreground">{CURRENCY_LABELS[c]}</div>
                <div className="text-2xl font-black mt-1">{formatMoney(Number(w?.balance ?? 0), c)}</div>
                {Number(w?.locked_balance ?? 0) > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    🔒 محجوز: {formatMoney(Number(w.locked_balance), c)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {profile && profile.kyc_status !== "verified" && !profile.commission_exempt && (
          <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/5 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-bold mb-0.5">حسابك غير موثّق بعد</div>
              <div className="text-muted-foreground">المزايدة في المزادات تتطلب توثيق الهوية. ارفع وثيقتك أدناه للمراجعة.</div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
              {profile.kyc_status === "pending" ? "قيد المراجعة" : "غير موثّق"}
            </span>
          </div>
        )}

        {profile && profile.kyc_status !== "verified" && (
          <KycUploader onSubmitted={load} />
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <form onSubmit={submitDeposit} className="glass rounded-3xl p-6 space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2"><ArrowDownToLine className="h-5 w-5" /> طلب إيداع يدوي</h2>
            <p className="text-sm text-muted-foreground">حوّل المبلغ إلى المحفظة المختارة، ثم ارفع صورة إشعار التحويل. سيُعتمد الإيداع يدوياً.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>المبلغ</Label>
                <Input type="number" min="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>العملة</Label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full h-10 rounded-md border border-border bg-input px-3">
                  {CURRENCIES.map((c) => <option key={c} value={c}>{CURRENCY_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>المحفظة / جهة التحويل</Label>
              <select value={form.gateway} onChange={(e) => setForm({ ...form, gateway: e.target.value })}
                className="w-full h-10 rounded-md border border-border bg-input px-3">
                {GATEWAYS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              {GATEWAY_NUMBERS[form.gateway] && (
                <p className="text-xs text-muted-foreground">
                  حوّل إلى الرقم: <span dir="ltr" className="font-mono font-bold text-foreground">{GATEWAY_NUMBERS[form.gateway]}</span> — باسم: زُلفى
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>رقم العملية / المرجع (اختياري)</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="رقم التحويل من الإشعار" />
            </div>
            <div className="space-y-1.5">
              <Label>صورة إشعار التحويل (مهم لتسريع التأكيد)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
              {proofFile && <p className="text-xs text-muted-foreground"><Upload className="h-3 w-3 inline" /> {proofFile.name}</p>}
            </div>
            <Button type="submit" disabled={submitting} className="w-full h-11 bg-gradient-primary text-primary-foreground shadow-glow">
              {submitting ? "..." : "إرسال طلب الإيداع"}
            </Button>
          </form>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-xl font-bold mb-3">طلبات الإيداع</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {deposits.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات بعد</p>}
              {deposits.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
                  <div>
                    <div className="font-bold">{formatMoney(Number(d.amount), d.currency)}</div>
                    <div className="text-xs text-muted-foreground">{d.gateway} · {new Date(d.created_at).toLocaleDateString("ar")}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    d.status === "confirmed" ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                    d.status === "rejected" ? "bg-destructive/20 text-destructive" :
                    "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                  }`}>
                    {d.status === "confirmed" ? "مؤكد" : d.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-3xl p-6">
          <h2 className="text-xl font-bold mb-3">سجل الحركات</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {ledger.length === 0 && <p className="text-sm text-muted-foreground">لا توجد حركات بعد</p>}
            {ledger.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
                <div>
                  <div className="text-sm font-medium">{t.note ?? t.kind}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("ar")} · {t.kind}</div>
                </div>
                <div className={`font-bold ${Number(t.amount) >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {Number(t.amount) >= 0 ? "+" : ""}{formatMoney(Number(t.amount), t.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
