import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import madLogo from "@/assets/mad-logo.png";

export const Route = createFileRoute("/card/$registrationId")({
  component: CardPage,
});

type CardData = {
  child_name: string;
  image_url: string | null;
};

function CardPage() {
  const { registrationId } = Route.useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    supabase
      .from("parent_registrations")
      .select("child_name, image_url")
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

  const handleDownload = async (imageUrl: string, childName: string) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${childName}-dream-card.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${childName}-dream-card.png`;
      a.click();
    }
  };

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
            <div className="rounded-3xl overflow-hidden shadow-lg">
              <img
                src={card.image_url}
                alt={`${card.child_name}'s dream card`}
                className="w-full aspect-square object-cover"
              />
            </div>
            <p className="text-center text-base font-semibold text-foreground">
              {card.child_name}'s Dream Card
            </p>
            <button
              onClick={() => handleDownload(card.image_url!, card.child_name)}
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
