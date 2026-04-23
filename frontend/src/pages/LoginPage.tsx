import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: api.auth.login,
  });

  const registerMutation = useMutation({
    mutationFn: api.auth.register,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isRegister) {
        const registerData = await registerMutation.mutateAsync({
          username,
          email,
          phone,
          password,
        });
        setToken(registerData.token);
        toast.success("Account created");
      } else {
        const loginData = await loginMutation.mutateAsync({
          email,
          password,
        });
        setToken(loginData.token);
        toast.success("Welcome back");
      }
      navigate("/");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      toast.error(message);
    }
  };

  const loading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-primary to-navy-700 p-4">
      <Card className="w-full max-w-md card-shadow">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              FT
            </div>
            <span className="text-2xl font-bold text-foreground">FinTrack</span>
          </div>
          <CardTitle className="text-lg text-foreground">{isRegister ? "Create Account" : "Welcome Back"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="alexmorgan" required /></div>
                <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+1234567890" /></div>
              </>
            )}
            <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="alex@example.com" required /></div>
            <div><Label>Password</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="********" required /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}</Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-sm text-primary hover:underline">
              {isRegister ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
