import { Outlet } from "react-router-dom";
import { PageTransitionReveal } from "./PageTransitionReveal";

export default function PublicLayout() {
  return (
    <div className="relative min-h-dvh">
      <PageTransitionReveal />
      <Outlet />
    </div>
  );
}
