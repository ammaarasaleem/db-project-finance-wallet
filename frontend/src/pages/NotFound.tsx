import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CashParticles } from "@/components/CashParticles";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
      <CashParticles type="coins" count={10} className="opacity-30" />
      <div className="text-center relative z-10 animate-coin-bounce">
        <p className="label-caps text-muted-foreground mb-3">404 — Page not found</p>
        <h1 className="text-6xl font-display font-black text-foreground mb-4">Oops!</h1>
        <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
