import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { CashParticles } from "@/components/CashParticles";
import { GlassCard } from "@/components/GlassCard";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({ mutationFn: api.auth.login });
  const registerMutation = useMutation({ mutationFn: api.auth.register });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isRegister) {
        const data = await registerMutation.mutateAsync({ username, email, phone, password });
        setToken(data.token);
        toast.success("Account created");
      } else {
        const data = await loginMutation.mutateAsync({ email, password });
        setToken(data.token);
        toast.success("Welcome back");
      }
      navigate("/");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    }
  };

  const loading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden login-panel">

        {/* Theme-aware layered gradient base */}
        <div className="absolute inset-0 login-panel-bg" />

        {/* Animated accent-coloured blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="login-blob login-blob-1" />
          <div className="login-blob login-blob-2" />
          <div className="login-blob login-blob-3" />
        </div>

        {/* Subtle noise film */}
        <div className="absolute inset-0 login-noise pointer-events-none" />

        {/* Floating cash particles */}
        <CashParticles count={18} type="rain" />

        {/* Brand row */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg overflow-hidden">
            <img src="/logo.png" alt="FinTrack" className="logo-fill" />
          </div>
          <span className="font-display text-xl font-black text-white drop-shadow-sm">FinTrack</span>
        </div>

        {/* Centrepiece: logo + copy */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-8">
          <div className="login-logo-ring mb-8">
            <img
              src="/logo2.png"
              alt="FinTrack logo"
              className="login-logo-img"
              draggable={false}
            />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-3 text-center drop-shadow-md">
            Take control of<br />your finances
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-xs text-center">
            Wallet transfers, bill splits, loans, rotating savings, and personal budgeting — all in one place.
          </p>
        </div>

        {/* Feature pills */}
        <div className="relative z-10 flex flex-wrap gap-2 justify-center">
          {[
            { icon: "⇄", label: "Peer-to-peer transfers" },
            { icon: "🍽", label: "Bill splits" },
            { icon: "📖", label: "Khata savings" },
            { icon: "🔒", label: "Goal vaults" },
          ].map(({ icon, label }) => (
            <div key={label} className="login-feature-pill">
              <span>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-10 bg-surface-container-low/30 relative">
        <CashParticles count={15} type="mixed" className="opacity-30 lg:hidden" />
        <GlassCard className="w-full max-w-sm relative z-10 p-6 sm:p-8 lg:p-10 border-border/50">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#ebebeb]">
                <img src="/logo.png" alt="FinTrack" className="logo-fill" />
            </div>
            <span className="font-display text-lg font-black text-foreground">FinTrack</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-1">
            {isRegister ? "Create an account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isRegister ? "Start managing your finances today." : "Sign in to your FinTrack account."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-1.5 block">Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="alexmorgan" required />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-1.5 block">Phone (optional)</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+1 234 567 8900" />
                </div>
              </>
            )}
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="alex@example.com" required />
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground mb-1.5 block">Password</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" required />
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-primary hover:underline font-medium"
            >
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
