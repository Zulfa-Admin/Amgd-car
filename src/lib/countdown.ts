export function formatCountdown(endsAt: string): { text: string; ended: boolean } {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { text: "انتهى المزاد", ended: true };
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return { text: `${d}ي ${h}س ${m}د`, ended: false };
  if (h > 0) return { text: `${h}س ${m}د ${sec}ث`, ended: false };
  return { text: `${m}د ${sec}ث`, ended: false };
}
