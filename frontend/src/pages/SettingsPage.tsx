import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@/lib/api";
import { GlassCard } from "@/components/GlassCard";

export default function SettingsPage() {
  const { data: me } = useCurrentUser();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const changePasswordMutation = useMutation({
    mutationFn: api.auth.changePassword,
  });

  const initials =
    (me?.username || "U")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changePasswordMutation.mutateAsync({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your profile</p>
      </div>

      <GlassCard liftOnHover className="p-6">
        <div className="pb-3 border-b border-border/50 mb-4">
          <h3 className="text-lg font-display font-semibold text-foreground">Profile</h3>
        </div>
        <div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4 group cursor-default">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold group-hover:animate-pulse-glow transition-all">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-foreground">{me?.username || ""}</p>
                <p className="text-sm text-muted-foreground">{me?.email || ""}</p>
              </div>
            </div>
            <div><Label>Username</Label><Input value={me?.username || ""} readOnly /></div>
            <div><Label>Email</Label><Input type="email" value={me?.email || ""} readOnly /></div>
            <div><Label>Phone</Label><Input type="tel" value={me?.phone || ""} readOnly /></div>
          </div>
        </div>
      </GlassCard>

      <GlassCard liftOnHover className="p-6">
        <div className="pb-3 border-b border-border/50 mb-4">
          <h3 className="text-lg font-display font-semibold text-foreground">Change Password</h3>
        </div>
        <div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
            <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div>
            <Button type="submit" disabled={changePasswordMutation.isPending}>{changePasswordMutation.isPending ? "Updating..." : "Update Password"}</Button>
          </form>
        </div>
      </GlassCard>
    </div>
  );
}
