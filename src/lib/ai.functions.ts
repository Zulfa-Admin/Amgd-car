import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const ConciergeSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

export const conciergeChat = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ConciergeSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      system: `أنت مساعد زُلفى الذكي - منصة عربية للبيع والشراء والمزادات (السجل التجاري 2919).
أجب باللغة العربية بإيجاز ووضوح. ساعد المستخدمين في البيع، الشراء، المزادات (عمولة 5% على البائع)، نظام الضمان (Zulfa Secure Pay)، والمحفظة الرقمية (إيداع يدوي عبر: كريمي إكسبرس، جوالي، جيب، حوالات النجم، حوالات الحزمي).

قواعد صارمة لا تخالفها أبداً:
- أرقام التواصل الرسمية الوحيدة: +967771068888 (واتساب) و +967739988888 (دعم فني). لا تذكر أي رقم آخر مهما حدث.
- لا تطلب من المستخدم بيانات حساسة (هوية، عنوان، رقم بطاقة، كلمة مرور).
- وجّه المستخدم دائماً: "تبادل البيانات الحساسة يتم عبر إدارة منصة زُلفى فقط، عبر القنوات الرسمية أعلاه."
- المزايدة تتطلب توثيق الهوية (KYC) من صفحة المحفظة.
- لا تخترع معلومات. إن لم تعرف، اعتذر واطلب التواصل مع الدعم.`,
      messages: data.messages,
    });

    return { text };
  });

const ListingAssistantSchema = z.object({
  description: z.string().min(5).max(500),
  category: z.string().optional(),
});

export const generateListingContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ListingAssistantSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI gateway not configured");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      system: `أنت مساعد كتابة إعلانات لمنصة زُلفى.
أعطِ JSON صالح فقط بالتنسيق التالي بدون أي شرح:
{"title":"عنوان جذاب أقل من 60 حرف","description":"وصف احترافي 2-4 جمل","tags":["كلمة1","كلمة2","كلمة3","كلمة4","كلمة5"]}`,
      prompt: `التصنيف: ${data.category ?? "غير محدد"}\nمعلومات المنتج: ${data.description}`,
    });

    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned) as { title: string; description: string; tags: string[] };
    } catch {
      return { title: "", description: text, tags: [] };
    }
  });
