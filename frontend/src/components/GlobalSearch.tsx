import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, User, CreditCard, PiggyBank, Users, FileText, ArrowRightLeft } from "lucide-react";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: friends = [] } = useQuery({ queryKey: ["friends"], queryFn: api.friends.getAll, enabled: open });
  const { data: vaults = [] } = useQuery({ queryKey: ["vaults"], queryFn: api.vaults.getAll, enabled: open });
  const { data: transactions = [] } = useQuery({ queryKey: ["wallet-transactions"], queryFn: () => api.wallet.getTransactions({ limit: 50 }), enabled: open });
  const { data: khataGroups = [] } = useQuery({ queryKey: ["khata-groups"], queryFn: api.khata.getGroups, enabled: open });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <div 
        className="hidden md:flex items-center bg-surface-container-low border border-border rounded-lg px-3 py-1.5 w-72 gap-2 cursor-pointer hover:border-primary transition-colors text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="text-sm w-full text-left">Search anything...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/wallet'))}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              <span>Wallet & Transactions</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/saving-vaults'))}>
              <PiggyBank className="mr-2 h-4 w-4" />
              <span>Saving Vaults</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/friends'))}>
              <User className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/khata-groups'))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Khata Groups</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/settings'))}>
              <FileText className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />

          {friends.length > 0 && (
            <CommandGroup heading="Friends">
              {friends.map((f) => (
                <CommandItem key={f.friendship_id} onSelect={() => runCommand(() => navigate('/friends'))}>
                  <User className="mr-2 h-4 w-4" />
                  <span>{f.username}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {vaults.length > 0 && (
            <CommandGroup heading="Vaults">
              {vaults.map((v) => (
                <CommandItem key={v.id} onSelect={() => runCommand(() => navigate('/saving-vaults'))}>
                  <PiggyBank className="mr-2 h-4 w-4" />
                  <span>{v.vault_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {khataGroups.length > 0 && (
            <CommandGroup heading="Khata Groups">
              {khataGroups.map((g) => (
                <CommandItem key={g.Id} onSelect={() => runCommand(() => navigate('/khata-groups'))}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>{g.Name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {transactions.length > 0 && (
            <CommandGroup heading="Recent Transactions">
              {transactions.slice(0, 10).map((tx) => (
                <CommandItem key={tx.transaction_id} onSelect={() => runCommand(() => navigate('/transactions'))}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  <span>{tx.note ? `${tx.note} (${tx.amount})` : `Transfer of ${tx.amount} with ${tx.sender === tx.receiver ? tx.sender : (tx.type === 'send' ? tx.receiver : tx.sender)}`}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
        </CommandList>
      </CommandDialog>
    </>
  );
}
