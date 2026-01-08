"use client";

import { useState, useMemo, memo } from "react";
import type { Socio } from "@/lib/soci-data";
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
import { MoreHorizontal, Pencil, Trash2, Filter, MessageCircle, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, HandHeart, Award } from "lucide-react";
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
import { doc, deleteDoc } from "firebase/firestore";
import { differenceInYears, format, parseISO } from 'date-fns';

// Helper Functions
export const getFullName = (socio: any) => `${socio.firstName || ''} ${socio.lastName || ''}`.trim();
export const getStatus = (socio: any): 'active' | 'pending' | 'rejected' => {
    if (socio.membershipStatus === 'active') return 'active';
    return socio.status || 'pending';
};
export const isMinor = (birthDate: string | Date | undefined) => birthDate ? differenceInYears(new Date(), new Date(birthDate)) < 18 : false;
export const formatDate = (dateString: any, outputFormat: string = 'dd/MM/yyyy') => {
  if (!dateString) return 'N/A';
  
  let date;
  if (dateString && typeof dateString.toDate === 'function') {
    date = dateString.toDate();
  } else {
    try {
      date = typeof dateString === 'string' && dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
    } catch {
      return String(dateString);
    }
  }

  try {
    return format(date, outputFormat);
  } catch {
    return 'Data non valida';
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

const SocioTableRow = memo(({ 
  socio,
  onEdit,
  onDelete,
}: { 
  socio: Socio; 
  onEdit: (socio: Socio) => void;
  onDelete: (id: string) => void;
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const status = getStatus(socio);
  const socioIsMinor = isMinor(socio.birthDate);
  const defaultFee = socio.membershipFee ?? (isMinor(socio.birthDate) ? 0 : 10);

  const handleDelete = async () => {
    if (!firestore) return;
    
    const collectionName = status === 'active' ? 'members' : 'membership_requests';
    const docRef = doc(firestore, collectionName, socio.id);
    
    try {
      await deleteDoc(docRef);
      toast({
          title: "Socio rimosso",
          description: `${getFullName(socio)} è stato rimosso dalla lista.`,
      });
      onDelete(socio.id);
    } catch (error) {
        console.error("Error deleting socio:", error);
        toast({
            title: "Errore",
            description: "Non è stato possibile rimuovere il socio.",
            variant: "destructive"
        });
    }
  };
  
  return (
    <TableRow>
        <TableCell className="font-medium">
           <div className="flex items-center gap-3">
                <Dialog>
                   <DialogTrigger asChild>
                     <div className="flex items-center gap-2 cursor-pointer group">
                        {socio.whatsappConsent && <MessageCircle className="w-4 h-4 text-green-500" />}
                        <span className="group-hover:text-primary transition-colors">{getFullName(socio)}</span>
                     </div>
                   </DialogTrigger>
                   <DialogContent className="max-w-md">
                     <DialogHeader>
                       <DialogTitle className="flex items-center gap-3"><User/> Dettagli Socio</DialogTitle>
                     </DialogHeader>
                     <div className="py-4 space-y-2 max-h-[70vh] overflow-y-auto p-1 pr-4">
                       <DetailRow icon={<User />} label="Nome Completo" value={getFullName(socio)} />
                       <DetailRow icon={<Award />} label="Qualifica" value={socio.qualifica} />
                       <DetailRow icon={<Mail />} label="Email" value={socio.email} />
                       <DetailRow icon={<Phone />} label="Telefono" value={socio.phone} />
                       <DetailRow icon={<Home />} label="Indirizzo" value={`${socio.address}, ${socio.city} (${socio.province}) ${socio.postalCode}`} />
                       <DetailRow icon={<Hash />} label="Codice Fiscale" value={socio.fiscalCode} />
                       <DetailRow icon={<Calendar />} label="Anno Associativo" value={socio.membershipYear || new Date().getFullYear()} />
                       <DetailRow icon={<Calendar />} label="Data Richiesta" value={formatDate(socio.requestDate)} />
                       <DetailRow icon={<Euro />} label="Quota Versata" value={`€ ${defaultFee}`} />
                       {socio.isVolunteer && <DetailRow icon={<HandHeart />} label="Volontario" value="Sì" />}
                       <DetailRow icon={<StickyNote />} label="Note" value={socio.notes} />
                     </div>
                   </DialogContent>
                 </Dialog>
                 {socio.qualifica && (
                    <Badge variant="secondary" className="text-xs ml-2 normal-case">{socio.qualifica}</Badge>
                 )}
                 {socioIsMinor && (
                   <Dialog>
                     <DialogTrigger asChild>
                       <Badge onClick={(e) => { e.stopPropagation(); }} variant="outline" className="text-xs border-yellow-400 text-yellow-400 cursor-pointer hover:bg-yellow-500/10 ml-2">Minore</Badge>
                     </DialogTrigger>
                     <DialogContent>
                       <DialogHeader>
                         <DialogTitle className="flex items-center gap-2"><ShieldCheck/> Dettagli Tutore</DialogTitle>
                       </DialogHeader>
                       <div className="py-4">
                         <DetailRow icon={<User />} label="Nome Tutore" value={`${socio.guardianFirstName} ${socio.guardianLastName}`} />
                         <DetailRow icon={<Calendar />} label="Data di Nascita Tutore" value={formatDate(socio.guardianBirthDate)} />
                       </div>
                     </DialogContent>
                   </Dialog>
                 )}
           </div>
        </TableCell>
        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
          <div>{formatDate(socio.birthDate)}</div>
          <div className="text-xs">{socio.birthPlace}</div>
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
              <DropdownMenuItem onSelect={() => onEdit(socio)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifica
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
                        Questa azione non può essere annullata. Questo rimuoverà permanentemente {getFullName(socio)} dalla lista.
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
  );
});
SocioTableRow.displayName = 'SocioTableRow';


interface SociTableProps {
  soci: Socio[];
  onEdit: (socio: Socio) => void;
  onSocioDelete: (id: string) => void;
}

export function SociTable({ soci, onEdit, onSocioDelete }: SociTableProps) {
  const [filter, setFilter] = useState('');

  const filteredSoci = useMemo(() => soci.filter(socio => {
    const fullName = getFullName(socio) || '';
    const email = socio.email || '';
    return fullName.toLowerCase().includes(filter.toLowerCase()) ||
           email.toLowerCase().includes(filter.toLowerCase());
  }), [soci, filter]);
  
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
            {filteredSoci.length > 0 ? (
              filteredSoci.map((socio) => (
                <SocioTableRow 
                  key={socio.id} 
                  socio={socio}
                  onEdit={onEdit}
                  onDelete={onSocioDelete}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Nessun socio trovato.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

    