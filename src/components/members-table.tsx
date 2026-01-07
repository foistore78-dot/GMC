"use client";

import { useState, useMemo, useEffect } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MoreHorizontal, Pencil, Trash2, Filter, MessageCircle, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, HandHeart } from "lucide-react";
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
import { useFirestore } from "@/firebase";
import { doc, writeBatch, deleteDoc } from "firebase/firestore";
import { differenceInYears, format } from 'date-fns';
import { EditMemberForm } from "./edit-member-form";

// Helper Functions
export const getFullName = (member: any) => `${member.firstName || ''} ${member.lastName || ''}`.trim();
export const getStatus = (member: any): 'active' | 'pending' | 'rejected' => {
    if (member.membershipStatus === 'active') return 'active';
    return member.status || 'pending';
};
export const isMinor = (birthDate: string | Date | undefined) => birthDate ? differenceInYears(new Date(), new Date(birthDate)) < 18 : false;
export const formatDate = (dateString: any) => {
  if (!dateString) return 'N/A';
  if (dateString && typeof dateString.toDate === 'function') {
    try { 
      return format(dateString.toDate(), 'dd/MM/yyyy'); 
    } catch { 
      return 'Data non valida'; 
    }
  }
  try { 
    return format(new Date(dateString), 'dd/MM/yyyy'); 
  } catch { 
    return String(dateString);
  }
};

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  pending: 'In attesa',
  rejected: 'Rifiutato',
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
  );
};

const MemberTableRow = ({ 
  member,
}: { 
  member: Member; 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const status = getStatus(member);
  const memberIsMinor = isMinor(member.birthDate);
  const defaultFee = member.membershipFee ?? (isMinor(member.birthDate) ? 0 : 10);

  const handleDelete = () => {
    if (!firestore) return;
    setIsDeleting(false);

    const collectionName = status === 'active' ? 'members' : 'membership_requests';
    const docRef = doc(firestore, collectionName, member.id);
    
    deleteDoc(docRef).then(() => {
        toast({
            title: "Membro rimosso",
            description: `${getFullName(member)} è stato rimosso dalla lista.`,
            variant: "destructive",
        });
    }).catch(error => {
        console.error("Error deleting member:", error);
        toast({
            title: "Errore",
            description: "Non è stato possibile rimuovere il membro.",
            variant: "destructive"
        });
    });
  };
  
  return (
    <>
      <TableRow>
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
                     <div className="py-4 space-y-2 max-h-[70vh] overflow-y-auto p-1 pr-4">
                       <DetailRow icon={<User />} label="Nome Completo" value={getFullName(member)} />
                       <DetailRow icon={<Mail />} label="Email" value={member.email} />
                       <DetailRow icon={<Phone />} label="Telefono" value={member.phone} />
                       <DetailRow icon={<Home />} label="Indirizzo" value={`${member.address}, ${member.city} (${member.province}) ${member.postalCode}`} />
                       <DetailRow icon={<Hash />} label="Codice Fiscale" value={member.fiscalCode} />
                       <DetailRow icon={<Calendar />} label="Anno Associativo" value={member.membershipYear || new Date().getFullYear()} />
                       <DetailRow icon={<Euro />} label="Quota Versata" value={`€ ${defaultFee}`} />
                       {member.isVolunteer && <DetailRow icon={<HandHeart />} label="Volontario" value="Sì" />}
                       <DetailRow icon={<StickyNote />} label="Note" value={member.notes} />
                     </div>
                   </DialogContent>
                 </Dialog>
                 {memberIsMinor && (
                   <Dialog>
                     <DialogTrigger asChild>
                       <Badge onClick={(e) => { e.stopPropagation(); }} variant="outline" className="text-xs border-yellow-400 text-yellow-400 cursor-pointer hover:bg-yellow-500/10 ml-2">Minore</Badge>
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
            variant={status === "active" ? "default" : status === "pending" ? "secondary" : "destructive"}
            className={cn({
              "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30": status === "active",
              "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30": status === "pending",
              "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30": status === "rejected",
            })}
          >
            {statusTranslations[status] || status}
          </Badge>
        </TableCell>
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
              <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
               <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
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
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <Sheet open={isEditing} onOpenChange={setIsEditing}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Modifica Membro: {getFullName(member)}</SheetTitle>
            </SheetHeader>
            <EditMemberForm 
              member={member} 
              onClose={() => setIsEditing(false)}
            />
        </SheetContent>
      </Sheet>
    </>
  );
};


export function MembersTable({ initialMembers, initialRequests }: { initialMembers: Member[], initialRequests: Member[] }) {
  const [filter, setFilter] = useState('');
  const [allItems, setAllItems] = useState<Member[]>([]);

  useEffect(() => {
    const combinedData: { [key: string]: Member } = {};

    (initialRequests || []).forEach(item => {
      if (item && item.id) combinedData[item.id] = { ...item } as Member;
    });
    
    (initialMembers || []).forEach(item => {
      if (item && item.id) combinedData[item.id] = { ...item } as Member;
    });

    const sortedItems = Object.values(combinedData).sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
    setAllItems(sortedItems);

  }, [initialMembers, initialRequests]);


  const filteredMembers = useMemo(() => allItems.filter(member => {
    const fullName = getFullName(member) || '';
    const email = member.email || '';
    return fullName.toLowerCase().includes(filter.toLowerCase()) ||
           email.toLowerCase().includes(filter.toLowerCase());
  }), [allItems, filter]);
  
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
              filteredMembers.map((member) => (
                <MemberTableRow 
                  key={member.id} 
                  member={member}
                />
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
