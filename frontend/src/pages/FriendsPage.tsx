import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const statusColors: Record<string, string> = {
  accepted: "bg-success/15 text-success border-success/20",
  pending: "bg-warning/15 text-warning border-warning/20",
};

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
    onError: (error) => toast.error(error instanceof Error ? error.message : "Request failed"),
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
    onError: (error) => toast.error(error instanceof Error ? error.message : "Accept failed"),
  });

  const removeMutation = useMutation({
    mutationFn: api.friends.remove,
    onSuccess: async () => {
      toast.success("Removed");
      await queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Remove failed"),
  });

  const merged = [
    ...accepted.map((f) => ({
      id: f.friendship_id,
      username: f.username,
      email: f.email,
      status: "accepted",
      initials: f.username
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    })),
    ...pending.map((f) => ({
      id: f.friendship_id,
      username: f.username,
      email: f.email,
      status: "pending",
      initials: f.username
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    })),
  ];

  const filtered = merged.filter((f) => f.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Friends</h2>
          <p className="text-sm text-muted-foreground">Manage your connections</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={friendUsername}
            onChange={(e) => setFriendUsername(e.target.value)}
            placeholder="username"
            className="w-40"
          />
          <Button onClick={() => sendMutation.mutate(friendUsername)} disabled={!friendUsername || sendMutation.isPending}>
            <UserPlus className="mr-2 h-4 w-4" />Add Friend
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by username..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((friend) => (
          <Card key={friend.id} className="card-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {friend.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{friend.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{friend.email}</p>
                  <Badge variant="outline" className={`text-xs mt-1 ${statusColors[friend.status]}`}>
                    {friend.status}
                  </Badge>
                </div>
                {friend.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => acceptMutation.mutate(friend.id)}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeMutation.mutate(friend.id)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
                {friend.status === "accepted" && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeMutation.mutate(friend.id)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
