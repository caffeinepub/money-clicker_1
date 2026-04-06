import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import AdminPage from "./pages/AdminPage";
import TipPage from "./pages/TipPage";

function getRoute(): "tip" | "admin" {
  const path = window.location.pathname;
  // Support both direct /admin access (IC fallback serves index.html)
  // and /?redirect=%2Fadmin from 404.html redirect
  if (path === "/admin") return "admin";
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (redirect) {
    window.history.replaceState({}, "", redirect);
    return redirect === "/admin" ? "admin" : "tip";
  }
  return "tip";
}

export default function App() {
  const [route, setRoute] = useState<"tip" | "admin">(getRoute);

  useEffect(() => {
    const onPopState = () => setRoute(getRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setRoute(getRoute());
  };

  return (
    <div className="min-h-screen font-body">
      <Toaster position="top-center" richColors />
      {route === "admin" ? (
        <AdminPage onNavigate={navigate} />
      ) : (
        <TipPage onNavigate={navigate} />
      )}
    </div>
  );
}
