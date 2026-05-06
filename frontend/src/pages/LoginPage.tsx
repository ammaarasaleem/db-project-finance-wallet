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
    <div className="min-h-screen flex bg-background">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <CashParticles count={25} type="rain" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-display font-black text-white">FT</div>
            <span className="font-display text-xl font-black text-white">FinTrack</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Take control of<br />your finances
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Wallet transfers, bill splits, loans, rotating savings (Khata), and personal budgeting — all in one place.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {[
            { icon: "⇄", label: "Peer-to-peer transfers" },
            { icon: "🍽", label: "Bill splits with friends" },
            { icon: "📖", label: "Khata rotating savings" },
            { icon: "🔒", label: "Goal-based vaults" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-white/80 text-sm">
              <span className="text-base">{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface-container-low/30 relative">
        <CashParticles count={15} type="mixed" className="opacity-30 lg:hidden" />
        <GlassCard className="w-full max-w-sm relative z-10 p-8 sm:p-10 border-border/50">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-sm">FT</div>
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
