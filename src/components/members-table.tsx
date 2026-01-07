"use client";

import { useState } from "react";
import type { Member } from "@/lib/members-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, MoreHorizontal, Pencil, Trash2, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "./ui/input";
import { useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";

type MembersTableProps = {
  initialMembers: any[];
};

export function MembersTable({ initialMembers }: MembersTableProps) {
  const [members, setMembers] = useState<any[]>(initialMembers);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleStatusChange = async (id: string, status: Member["status"]) => {
    
    const memberToUpdate = members.find((m) => m.id === id);
    if (!memberToUpdate) return;
    
    if (status === "approved") {
        // Move from requests to members
        const { id: oldId, requestDate, ...memberData } = memberToUpdate;
        const newMemberData = {
          ...memberData,
          status: 'approved',
          joinDate: serverTimestamp(),
          expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        };
        const membersCollection = collection(firestore, 'members');
        const newMemberRef = await addDocumentNonBlocking(membersCollection, newMemberData);

        // Delete from requests
        const requestRef = doc(firestore, "membership_requests", id);
        await deleteDocumentNonBlocking(requestRef);

        setMembers((prev) => [...prev.filter(m => m.id !== id), {...newMemberData, id: newMemberRef.id}]);

         toast({
            title: "Membro Approvato!",
            description: `${memberToUpdate.firstName} è ora un membro del club.`,
        });

    } else {
        // Update status in place (for pending -> rejected)
        const memberRef = doc(firestore, memberToUpdate.status === 'pending' ? "membership_requests" : "members", id);
        await setDocumentNonBlocking(memberRef, { status }, { merge: true });
        
        setMembers((prevMembers) =>
          prevMembers.map((member) =>
            member.id === id ? { ...member, status } : member
          )
        );
        toast({
          title: "Stato membro aggiornato!",
          description: `Il membro è stato impostato su ${status}.`,
        });
    }

  };

  const handleDelete = async (id: string) => {
    const memberToDelete = members.find((m) => m.id === id);
    if (!memberToDelete) return;

    const collectionName = memberToDelete.status === 'pending' ? 'membership_requests' : 'members';
    const docRef = doc(firestore, collectionName, id);
    await deleteDocumentNonBlocking(docRef);

    setMembers((prevMembers) => prevMembers.filter((member) => member.id !== id));
    toast({
      title: "Membro rimosso",
      description: "Il membro è stato rimosso dalla lista.",
      variant: "destructive",
    });
  };
  
  const getFullName = (member: any) => {
    if (member.name) return member.name;
    return `${member.firstName || ''} ${member.lastName || ''}`.trim();
  }

  const filteredMembers = members.filter(member => {
    const fullName = getFullName(member);
    return fullName.toLowerCase().includes(filter.toLowerCase()) ||
           member.email.toLowerCase().includes(filter.toLowerCase())
  });

  return (
    <div>
        <div className="flex items-center py-4">
            <div className="relative w-full max-w-sm">
                 <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Filtra per nome o email..."
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Contatto</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="hidden lg:table-cell">Strumenti</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{getFullName(member)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    <div>{member.email}</div>
                    <div>{member.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        member.status === "approved"
                          ? "default"
                          : member.status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className={cn({
                        "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30": member.status === "approved",
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30": member.status === "pending",
                        "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30": member.status === "rejected",
                        "text-primary-foreground": member.status === 'approved'
                      })}
                    >
                      {member.status === 'approved' ? 'approvato' : member.status === 'pending' ? 'in attesa' : 'rifiutato'}
                    </Badge>
                  </TableCell>
                   <TableCell className="hidden lg:table-cell text-muted-foreground">{member.instruments}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Apri menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                        {member.status !== 'approved' && (
                            <DropdownMenuItem
                            onClick={() => handleStatusChange(member.id, "approved")}
                            >
                            <Check className="mr-2 h-4 w-4" /> Approva
                            </DropdownMenuItem>
                        )}
                        {member.status !== 'rejected' && (
                            <DropdownMenuItem
                            onClick={() => handleStatusChange(member.id, "rejected")}
                            >
                            <X className="mr-2 h-4 w-4" /> Rifiuta
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toast({title: "L'azione di modifica è in fase di sviluppo."})}>
                          <Pencil className="mr-2 h-4 w-4" /> Modifica
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-500 focus:text-red-400 focus:bg-red-500/10">
                              <Trash2 className="mr-2 h-4 w-4" /> Elimina
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Questa azione non può essere annullata. Questo rimuoverà permanentemente {getFullName(member)} dalla lista.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(member.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Elimina
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                    Nessun membro trovato.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
