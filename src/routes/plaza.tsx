import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ChatBox } from "@/components/ChatBox";
import { Megaphone, Users } from "lucide-react";

export const Route = createFileRoute("/plaza")({
  component: PlazaPage,
  head: () => ({
    meta: [
      { title: "ساحة زُلفى — الشات العام" },
      { name: "description", content: "ساحة زُلفى: الشات العام لكل مستخدمي المنصة. ناقش الصفقات، اسأل، وتعرف على بائعين موثوقين." },
    ],
  }),
});

function PlazaPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 sm:px-6 py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-primary/10 border border-primary/20 text-xs font-bold">
            <Megaphone className="h-3.5 w-3.5" /> الطبقة الأولى — الساحة العامة
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gradient">ساحة زُلفى</h1>
          <p className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
            <Users className="h-4 w-4" /> دردشة عامة لجميع مستخدمي المنصة
          </p>
        </div>

        <ChatBox
          table="plaza_messages"
          insertPayload={(userId, body) => ({ user_id: userId, body })}
          maxLen={280}
          title="💬 الدردشة العامة"
          emptyHint="كن أول من يبدأ الحديث في الساحة!"
          height="h-[60vh]"
        />

        <p className="text-center text-xs text-muted-foreground">
          🔒 لحماية الجميع: الأرقام، الروابط، والإيميلات تُحجب تلقائياً. للتفاوض الخاص استخدم شات الصفقة بعد الفوز بالمزاد.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
