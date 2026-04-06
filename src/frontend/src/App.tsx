import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import AdminPage from "./pages/AdminPage";
import TipPage from "./pages/TipPage";

function getRoute(): "tip" | "admin" {
  return window.location.pathname === "/admin" ? "admin" : "tip";
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
