import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { compressImage } from "@/lib/image-compress";
import { toast } from "sonner";
import { ShieldCheck, Upload } from "lucide-react";

export function KycUploader({ onSubmitted }: { onSubmitted?: () => void }) {
  const { user } = useAuth();
  const [docType, setDocType] = useState("national_id");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    setBusy(true);
    try {
      const compressed = await compressImage(file, { maxSizeMB: 1.2, maxWidthOrHeight: 2000 });
      const path = `${user.id}/${Date.now()}-${docType}.${(compressed.name.split(".").pop() || "jpg").toLowerCase()}`;
      const { error: upErr } = await supabase.storage.from("kyc-docs").upload(path, compressed, { upsert: false });
      if (upErr) throw upErr;
      const { error } = await supabase.from("kyc_documents").insert({
        user_id: user.id, doc_type: docType, file_url: path,
      });
      if (error) throw error;
      toast.success("تم إرسال وثيقتك للمراجعة. سيتم تفعيل المزايدة فور التحقق.");
      setFile(null);
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e.message ?? "تعذر الرفع");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="glass rounded-3xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h3 className="font-black">توثيق الهوية (KYC) — مطلوب للمزايدة</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        ارفع صورة واضحة للهوية أو جواز السفر. تُراجَع يدوياً من إدارة زُلفى. لا يتم مشاركة بياناتك مع أي طرف خارجي.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>نوع الوثيقة</Label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} className="w-full h-10 rounded-md border border-border bg-input px-3">
            <option value="national_id">بطاقة وطنية</option>
            <option value="passport">جواز سفر</option>
            <option value="driver_license">رخصة قيادة</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>الصورة</Label>
          <Input type="file" accept="image/*" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      <Button type="submit" disabled={busy || !file} className="w-full h-11 bg-gradient-primary text-primary-foreground shadow-glow">
        <Upload className="h-4 w-4 ml-2" /> {busy ? "جارٍ الرفع..." : "إرسال للتحقق"}
      </Button>
    </form>
  );
}
