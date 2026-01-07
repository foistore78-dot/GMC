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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Check, MoreHorizontal, Pencil, Trash2, X, Filter, MessageCircle, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, MapPin, Euro, StickyNote, HandHeart, CheckCircle } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "./ui/input";
import { useFirestore, setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { differenceInYears, format } from 'date-fns';
import { EditMemberForm } from "./edit-member-form";

type MembersTableProps = {
  initialMembers: any[];
};

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | number | null }) => {
  if (!value && typeof value !== 'number') return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-secondary">
      <div className="text-primary mt-1">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
};

export function MembersTable({ initialMembers }: MembersTableProps) {
  const [members, setMembers] = useState<any[]>(initialMembers);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleApprove = async (id: string) => {
    const memberToUpdate = members.find((m) => m.id === id);
    if (!memberToUpdate || !firestore) return;

    // 1. Create the new member document
    const { id: oldId, requestDate, ...memberData } = memberToUpdate;
    const newMemberData = {
      ...memberData,
      membershipStatus: 'active',
      joinDate: serverTimestamp(),
      expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    };
    const membersCollection = collection(firestore, 'members');
    // We await this to get the new ID for the state update
    const newMemberRef = await addDocumentNonBlocking(membersCollection, newMemberData);

    // 2. Delete the old membership request
    const requestRef = doc(firestore, "membership_requests", id);
    await deleteDocumentNonBlocking(requestRef);
    
    // 3. Update the local state correctly
    setMembers((prev) => 
      prev.map(m => (m.id === id ? { ...newMemberData, id: newMemberRef.id } : m))
    );

    toast({
        title: "Membro Approvato!",
        description: `${memberToUpdate.firstName} è ora un membro del club.`,
    });
  };

  const handleReject = async (id: string) => {
    const memberToUpdate = members.find((m) => m.id === id);
    if (!memberToUpdate || !firestore) return;

    const memberRef = doc(firestore, "membership_requests", id);
    await setDocumentNonBlocking(memberRef, { status: 'rejected' }, { merge: true });
    
    setMembers((prevMembers) =>
      prevMembers.map((member) =>
        member.id === id ? { ...member, status: 'rejected' } : member
      )
    );
    toast({
      title: "Richiesta Rifiutata",
      description: `La richiesta di ${memberToUpdate.firstName} è stata rifiutata.`,
      variant: "destructive"
    });
  }


  const handleDelete = async (id: string) => {
    const memberToDelete = members.find((m) => m.id === id);
    if (!memberToDelete || !firestore) return;

    const collectionName = getStatus(memberToDelete) === 'pending' ? 'membership_requests' : 'members';
    const docRef = doc(firestore, collectionName, id);
    await deleteDocumentNonBlocking(docRef);

    setMembers((prevMembers) => prevMembers.filter((member) => member.id !== id));
    toast({
      title: "Membro rimosso",
      description: "Il membro è stato rimosso dalla lista.",
      variant: "destructive",
    });
  };

  const handleUpdateMember = (updatedMember: Member) => {
    setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
  };
  
  const getFullName = (member: any) => {
    return `${member.firstName || ''} ${member.lastName || ''}`.trim();
  }

  const filteredMembers = members.filter(member => {
    const fullName = getFullName(member);
    return fullName.toLowerCase().includes(filter.toLowerCase()) ||
           (member.email && member.email.toLowerCase().includes(filter.toLowerCase()));
  });
  
  const getStatus = (member: any) => member.status || member.membershipStatus;
  
  const isMinor = (birthDate: string) => {
    if (!birthDate) return false;
    return differenceInYears(new Date(), new Date(birthDate)) < 18;
  }

  const formatDate = (dateString: any) => {
    if (!dateString) return 'N/A';
    // Handle Firestore Timestamp objects
    if (dateString.toDate) {
      try {
        return format(dateString.toDate(), 'dd/MM/yyyy');
      } catch {
        return 'Data non valida';
      }
    }
    // Handle string dates
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  }

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
              <TableHead className="hidden md:table-cell">Nascita</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const status = getStatus(member);
                const memberIsMinor = isMinor(member.birthDate);
                const defaultFee = member.membershipFee ?? (isMinor(member.birthDate) ? 0 : 10);

                return (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                        <Dialog>
                           <DialogTrigger asChild>
                             <div className="flex items-center gap-2 cursor-pointer group">
                                {member.whatsappConsent && <MessageCircle className="w-4 h-4 text-green-500" />}
                                <span className="group-hover:text-primary transition-colors">{getFullName(member)}</span>
                             </div>
                           </DialogTrigger>
                           <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-3"><User/> Dettagli Membro</DialogTitle>
                              </DialogHeader>
                               <div className="py-4 space-y-2">
                                  <DetailRow icon={<User />} label="Nome Completo" value={getFullName(member)} />
                                  <DetailRow icon={<Mail />} label="Email" value={member.email} />
                                  <DetailRow icon={<Phone />} label="Telefono" value={member.phone} />
                                  <DetailRow icon={<Home />} label="Indirizzo" value={`${member.address}, ${member.city} (${member.province}) ${member.postalCode}`} />
                                  <DetailRow icon={<Hash />} label="Codice Fiscale" value={member.fiscalCode} />
                                  <DetailRow icon={<Calendar />} label="Anno Associativo" value={member.membershipYear} />
                                  <DetailRow icon={<Euro />} label="Quota Versata" value={`€ ${defaultFee}`} />
                                  {member.isVolunteer && <DetailRow icon={<HandHeart />} label="Volontario" value="Sì" />}
                                  <DetailRow icon={<StickyNote />} label="Note" value={member.notes} />
                               </div>
                           </DialogContent>
                        </Dialog>
                        {memberIsMinor && (
                          <Dialog>
                            <DialogTrigger asChild>
                               <Badge onClick={(e) => { e.stopPropagation(); }} variant="outline" className="text-xs border-yellow-400 text-yellow-400 cursor-pointer hover:bg-yellow-500/10">Minore</Badge>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2"><ShieldCheck/> Dettagli Tutore</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                  <DetailRow icon={<User />} label="Nome Tutore" value={`${member.guardianFirstName} ${member.guardianLastName}`} />
                                  <DetailRow icon={<Calendar />} label="Data di Nascita Tutore" value={formatDate(member.guardianBirthDate)} />
                                </div>
                            </DialogContent>
                          </Dialog>
                        )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    <div>{formatDate(member.birthDate)}</div>
                    <div className="text-xs">{member.birthPlace}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        status === "active" || status === "approved"
                          ? "default"
                          : status === "pending"
                          ? "secondary"
                          : "destructive"
                      }
                      className={cn({
                        "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30": status === "active" || status === "approved",
                        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30": status === "pending",
                        "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30": status === "rejected",
                      })}
                    >
                      {status === 'active' || status === 'approved' ? 'approvato' : status === 'pending' ? 'in attesa' : 'rifiutato'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Apri menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                          {status === 'pending' && (
                              <DropdownMenuItem
                              onClick={() => handleApprove(member.id)}
                              >
                              <Check className="mr-2 h-4 w-4" /> Approva
                              </DropdownMenuItem>
                          )}
                          {status === 'pending' && (
                              <DropdownMenuItem
                              onClick={() => handleReject(member.id)}
                              >
                              <X className="mr-2 h-4 w-4" /> Rifiuta
                              </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DialogTrigger asChild>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-4 w-4" /> Modifica
                            </DropdownMenuItem>
                          </DialogTrigger>
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
                      <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Modifica Membro: {getFullName(member)}</DialogTitle>
                          </DialogHeader>
                          <EditMemberForm member={member} onUpdate={handleUpdateMember} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              )})
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
