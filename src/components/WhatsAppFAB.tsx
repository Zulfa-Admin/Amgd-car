import { MessageCircle } from "lucide-react";
import { ZULFA_PHONE_MAIN } from "./SiteFooter";

export function WhatsAppFAB() {
  const href = `https://wa.me/${ZULFA_PHONE_MAIN.replace("+", "")}?text=${encodeURIComponent("مرحباً، أحتاج مساعدة في منصة زُلفى")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      aria-label="تواصل عبر واتساب"
      className="fixed bottom-5 left-5 z-50 h-14 w-14 rounded-full grid place-items-center bg-[#25D366] text-white shadow-glow hover:scale-105 transition-transform"
    >
      <MessageCircle className="h-7 w-7" />
      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 animate-ping" />
    </a>
  );
}
