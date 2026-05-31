import { Link } from "@tanstack/react-router";
import { formatPrice, timeAgo } from "@/lib/format";
import { ImageOff, MapPin } from "lucide-react";

interface Props {
  l: {
    id: string;
    title: string;
    price: number;
    currency: string;
    city: string | null;
    images: string[];
    created_at: string;
  };
}

export function ListingCard({ l }: Props) {
  const img = l.images?.[0];
  return (
    <Link
      to="/listing/$id"
      params={{ id: l.id }}
      className="group glass rounded-3xl overflow-hidden hover:border-primary/40 hover:-translate-y-1 hover:shadow-glow transition-all duration-300 flex flex-col"
    >
      <div className="aspect-[4/3] bg-secondary/40 relative overflow-hidden">
        {img ? (
          <img src={img} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-bold line-clamp-2 mb-2">{l.title}</h3>
        <div className="text-xl font-black text-gradient mb-3">{formatPrice(l.price, l.currency)}</div>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.city ?? "—"}</span>
          <span>{timeAgo(l.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}
