import { useRef } from "react";
import { Outlet } from "react-router-dom";
import { PageTransitionReveal } from "./PageTransitionReveal";

export default function PublicLayout() {
  const targetScrollRef = useRef<number | null>(null);
  return (
    <div className="relative min-h-dvh">
      <PageTransitionReveal targetScrollRef={targetScrollRef} />
      <Outlet />
    </div>
  );
}
