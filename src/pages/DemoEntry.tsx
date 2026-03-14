import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShelfStore } from "@/store/useShelfStore";
import type { DemoSnapshot } from "@/store/useShelfStore";
import { LoadingState } from "@/components/ui/loading-state";

export default function DemoEntry() {
  const navigate = useNavigate();
  const enterDemoMode = useShelfStore((s) => s.enterDemoMode);
  const isDemoMode = useShelfStore((s) => s.isDemoMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already in demo mode — go straight to the app
    if (isDemoMode) {
      navigate("/", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/demo-data.json");
        if (!res.ok) throw new Error(`Failed to load demo data (${res.status})`);
        const snapshot: DemoSnapshot = await res.json();
        enterDemoMode(snapshot);
        navigate("/", { replace: true });
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load demo");
      }
    };

    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-4 p-8 text-center">
        <p className="text-muted-foreground text-sm">{error}</p>
        <button
          type="button"
          className="text-sm underline underline-offset-4"
          onClick={() => navigate("/marketing")}
        >
          Back to home
        </button>
      </div>
    );
  }

  return <LoadingState />;
}
