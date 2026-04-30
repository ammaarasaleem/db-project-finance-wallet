import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, UserPlus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function FriendsPage() {
  const [search, setSearch] = useState("");
  const [friendUsername, setFriendUsername] = useState("");
  const queryClient = useQueryClient();

  const { data: accepted = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll });
  const { data: pending = [] } = useQuery({ queryKey: ["friends-pending"], queryFn: api.friends.getPending });

  const sendMutation = useMutation({
    mutationFn: api.friends.sendRequest,
    onSuccess: async () => {
      toast.success("Friend request sent");
      setFriendUsername("");
      await queryClient.invalidateQueries({ queryKey: ["friends-pending"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Request failed"),
  });

  const acceptMutation = useMutation({
    mutationFn: api.friends.accept,
    onSuccess: async () => {
      toast.success("Request accepted");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friends"] }),
        queryClient.invalidateQueries({ queryKey: ["friends-pending"] }),
      ]);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Accept failed"),
  });

  const removeMutation = useMutation({
    mutationFn: api.friends.remove,
    onSuccess: async () => {
      toast.success("Removed");
      await queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Remove failed"),
  });

  const initials = (name: string) =>
    name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const filteredAccepted = accepted.filter((f) =>
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Friends</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your connections</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
            placeholder="Enter username…"
            className="w-full sm:w-44"
            onKeyDown={(e) => {
              if (e.key === "Enter" && friendUsername.trim()) {
                e.preventDefault();
                sendMutation.mutate(friendUsername.trim());
              }
            }}
          />
          <Button
            onClick={() => friendUsername.trim() && sendMutation.mutate(friendUsername.trim())}
            disabled={!friendUsername.trim() || sendMutation.isPending}
          >
            <UserPlus className="mr-2 h-4 w-4" /> Add Friend
          </Button>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-display font-semibold text-foreground">
              Pending Requests{" "}
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {pending.length}
              </span>
            </h3>
          </div>
          <div className="divide-y divide-border">
            {pending.map((f) => (
              <div key={f.friendship_id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-display font-bold text-sm text-foreground shrink-0">
                    {initials(f.username)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.username}</p>
                    <p className="text-xs text-muted-foreground">{f.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptMutation.mutate(f.friendship_id)}
                    disabled={acceptMutation.isPending}
                  >
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeMutation.mutate(f.friendship_id)}
                    disabled={removeMutation.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search friends…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Friends grid */}
      {filteredAccepted.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center card-shadow">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-display font-semibold text-foreground mb-1">
            {search ? "No friends match your search" : "No friends yet"}
          </p>
          <p className="text-sm text-muted-foreground">
            {search ? "Try a different username." : "Add a friend using their username above."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccepted.map((f) => (
            <div key={f.friendship_id} className="bg-card border border-border rounded-xl p-4 card-shadow flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-sm shrink-0">
                {initials(f.username)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{f.username}</p>
                <p className="text-xs text-muted-foreground truncate">{f.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-soft text-emerald text-xs font-medium">
                  Friends
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-coral-soft"
                onClick={() => removeMutation.mutate(f.friendship_id)}
                disabled={removeMutation.isPending}
                title="Remove friend"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
