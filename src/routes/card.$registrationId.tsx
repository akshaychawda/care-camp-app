import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { downloadCardWithCaption } from "@/lib/card-image";
import madLogo from "@/assets/mad-logo.png";

export const Route = createFileRoute("/card/$registrationId")({
  component: CardPage,
});

type CardData = {
  child_name: string;
  image_url: string | null;
  caption: string | null;
};

function CardPage() {
  const { registrationId } = Route.useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("parent_registrations")
      .select("child_name, image_url, caption")
      .eq("id", registrationId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
        } else {
          setCard(data);
        }
        setLoading(false);
      });
  }, [registrationId]);


  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* MAD Logo */}
        <div className="flex justify-center">
          <div className="inline-flex items-center justify-center px-5 py-2 rounded-2xl bg-primary">
            <img src={madLogo} alt="MAD — Make A Difference" className="h-8 w-auto" />
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && notFound && (
          <div className="text-center space-y-3 py-8">
            <p className="text-xl font-bold text-foreground">Card not found</p>
            <p className="text-sm text-muted-foreground">
              This link may be invalid or the card may have been removed.
            </p>
          </div>
        )}

        {!loading && card && !card.image_url && (
          <div className="text-center space-y-3 py-8">
            <p className="text-xl font-bold text-foreground">Card not ready yet</p>
            <p className="text-sm text-muted-foreground">
              {card.child_name}'s dream card hasn't been generated yet. Please check back later.
            </p>
          </div>
        )}

        {!loading && card && card.image_url && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden shadow-lg">
              <img
                src={card.image_url}
                alt={`${card.child_name}'s dream card`}
                className="w-full aspect-square object-cover"
              />
              <div className="absolute top-3 right-3 bg-[#C62828] rounded-xl px-3 py-2 flex items-center">
                <img src={madLogo} alt="MAD" className="h-6 w-auto object-contain" />
              </div>
              {card.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-12">
                  <p className="font-display italic text-white text-lg leading-snug">
                    "{card.caption}"
                  </p>
                </div>
              )}
            </div>
            <p className="text-center text-base font-semibold text-foreground">
              {card.child_name}'s Dream Card
            </p>
            <button
              onClick={() => downloadCardWithCaption(card.image_url!, card.caption, card.child_name)}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Download className="h-5 w-5" /> Download Card
            </button>
            <p className="text-center text-xs text-muted-foreground">
              Made with ❤️ by Make A Difference
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
