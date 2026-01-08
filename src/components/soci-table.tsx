"use client";

import { useState, useMemo, useEffect } from "react";
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
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Pencil, Trash2, Filter, MessageCircle, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, HandHeart, Award, CircleDot, CheckCircle, Loader2 } from "lucide-react";
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
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { useFirestore } from "@/firebase";
import { doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { differenceInYears, format, parseISO, isValid } from 'date-fns';
import { QUALIFICHE, isMinorCheck as isMinor } from "./edit-socio-form";


// Helper Functions
export const getFullName = (socio: any) => `${socio.firstName || ''} ${socio.lastName || ''}`.trim();
export const getStatus = (socio: any): 'active' | 'pending' | 'rejected' => {
    if (socio.membershipStatus === 'active') return 'active';
    if (socio.status === 'rejected') return 'rejected';
    return socio.status || 'pending';
};


export const formatDate = (dateString: any, outputFormat: string = 'dd/MM/yyyy') => {
    if (!dateString) return 'N/A';

    let date: Date;

    // Check if it's a Firestore Timestamp and convert it
    if (dateString && typeof dateString.toDate === 'function') {
        date = dateString.toDate();
    } else if (typeof dateString === 'string') {
        // Handle ISO strings with 'T' (e.g., '2024-05-21T10:00:00.000Z')
        // and date-only strings (e.g., '2024-05-21')
        const d = dateString.includes('T') ? parseISO(dateString) : new Date(dateString);
        
        // The new Date('yyyy-mm-dd') constructor can be off by one day due to timezones.
        // To fix this, we parse it as UTC if it's just a date string.
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateString.split('-').map(Number);
            date = new Date(Date.UTC(year, month - 1, day));
        } else {
            date = d;
        }
    } else if (dateString instanceof Date) {
        // It's already a native JavaScript Date object
        date = dateString;
    } else {
        return 'N/A'; // Unrecognized format
    }

    // After all conversions, check if the final date is valid
    if (!isValid(date)) {
        return 'N/A';
    }

    try {
        // Format the valid date
        return format(date, outputFormat);
    } catch {
        return 'N/A'; // Return N/A if formatting fails for any reason
    }
};


const formatCurrency = (value: number | undefined | null) => {
    const number = value ?? 0;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(number);
}

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  pending: 'Sospeso',
  rejected: 'Rifiutato',
};

const QUALIFICA_COLORS: Record<string, string> = {
  "SOCIO FONDATORE": "text-yellow-400",
  "VOLONTARIO": "text-sky-400",
  "MUSICISTA": "text-fuchsia-400",
  "default": "text-gray-400",
};


const DetailRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string | number | null | React.ReactNode }) => {
  if (!value && typeof value !== 'number' && typeof value !== 'object') return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b border-secondary">
      <div className="text-primary mt-1">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
};

const SocioTableRow = ({ 
  socio,
  onEdit,
  allMembers
}: { 
  socio: Socio; 
  onEdit: (socio: Socio) => void;
  allMembers: Socio[];
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [membershipFee, setMembershipFee] = useState(10);
  const [qualifiche, setQualifiche] = useState<string[]>([]);


  const status = getStatus(socio);
  const socioIsMinor = isMinor(socio.birthDate);

  useEffect(() => {
    if (showApproveDialog) {
      const currentYear = new Date().getFullYear();
      const yearMembers = allMembers.filter(m => m.membershipYear === String(currentYear) && m.tessera);
      const nextMemberNumberValue = yearMembers.length + 1;
      setNewMemberNumber(String(nextMemberNumberValue));
      setMembershipFee(socioIsMinor ? 0 : 10);
      setQualifiche(socio.qualifica || []);
    }
  }, [showApproveDialog, allMembers, socioIsMinor, socio.qualifica]);

  const handleDelete = async () => {
    if (!firestore || isDeleting) return;
    setIsDeleting(true);
    
    let collectionName;
    if (status === 'active') {
        collectionName = 'members';
    } else { // pending or rejected
        collectionName = 'membership_requests';
    }

    const docRef = doc(firestore, collectionName, socio.id);
    
    try {
      await deleteDoc(docRef);
      toast({
          title: "Socio rimosso",
          description: `${getFullName(socio)} è stato rimosso dalla lista.`,
      });
    } catch (error) {
        console.error("Error deleting socio:", error);
        toast({
            title: "Errore",
            description: "Non è stato possibile rimuovere il socio.",
            variant: "destructive"
        });
    } finally {
        setIsDeleting(false);
    }
  };

  const handleApprove = async () => {
    if (!firestore || isApproving) return;

    setIsApproving(true);
    const currentYear = new Date().getFullYear();
    const membershipCardNumber = `GMC-${currentYear}-${newMemberNumber}`;

    const batch = writeBatch(firestore);

    const requestDocRef = doc(firestore, "membership_requests", socio.id);
    const memberDocRef = doc(firestore, "members", socio.id);

    const newMemberData: Omit<Socio, 'status'> & { membershipStatus: 'active' } = {
        ...socio,
        membershipStatus: 'active' as const,
        joinDate: serverTimestamp() as any, // Let Firestore set the date
        expirationDate: new Date(new Date().setFullYear(currentYear + 1)).toISOString(),
        membershipYear: String(currentYear),
        tessera: membershipCardNumber,
        membershipFee: membershipFee,
        qualifica: qualifiche,
    };
    delete (newMemberData as any).requestDate;
    delete (newMemberData as any).status;

    batch.set(memberDocRef, newMemberData, { merge: true });
    batch.delete(requestDocRef);

    try {
        await batch.commit();
        toast({
            title: "Socio Approvato!",
            description: `${getFullName(socio)} è ora un membro attivo. N. tessera: ${membershipCardNumber}`,
        });
        setShowApproveDialog(false);
    } catch (error) {
        console.error("Error approving member:", error);
        toast({
            title: "Errore di Approvazione",
            description: `Impossibile approvare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: "destructive",
        });
    } finally {
      setIsApproving(false);
    }
  };
  
  const handleQualificaChange = (qualifica: string, checked: boolean) => {
    setQualifiche(prev => 
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };
  
  return (
    <>
    <TableRow>
        <TableCell className="font-medium">
           <div className="flex items-center gap-3 flex-wrap">
                <Dialog>
                   <DialogTrigger asChild>
                     <div className="flex items-center gap-2 cursor-pointer group">
                        {socio.tessera && <span className="font-mono text-xs text-muted-foreground">{socio.tessera.substring(4)}</span>}
                        <span className="group-hover:text-primary transition-colors">{getFullName(socio)}</span>
                        {socio.whatsappConsent && <MessageCircle className="w-4 h-4 text-green-500" />}
                     </div>
                   </DialogTrigger>
                   <DialogContent className="max-w-md">
                     <DialogHeader>
                       <DialogTitle className="flex items-center gap-3"><User/> Dettagli Socio</DialogTitle>
                     </DialogHeader>
                     <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto p-1 pr-4">
                       <DetailRow icon={<CircleDot />} label="Stato" value={statusTranslations[status]} />
                       {socio.tessera && <DetailRow icon={<Hash />} label="N. Tessera" value={socio.tessera} />}
                       <DetailRow icon={<User />} label="Nome Completo" value={getFullName(socio)} />
                       <DetailRow icon={<Award />} label="Qualifiche" value={
                          socio.qualifica && socio.qualifica.length > 0
                            ? <div className="flex flex-wrap gap-1 mt-1">{socio.qualifica.map(q => <Badge key={q} variant="secondary" className="text-xs">{q}</Badge>)}</div>
                            : "Nessuna"
                        } />
                       <DetailRow icon={<Mail />} label="Email" value={socio.email} />
                       <DetailRow icon={<Phone />} label="Telefono" value={socio.phone} />
                       <DetailRow icon={<Home />} label="Indirizzo" value={`${socio.address}, ${socio.city} (${socio.province}) ${socio.postalCode}`} />
                       <DetailRow icon={<Hash />} label="Codice Fiscale" value={socio.fiscalCode} />
                       <DetailRow icon={<Calendar />} label="Anno Associativo" value={socio.membershipYear || new Date().getFullYear()} />
                       <DetailRow icon={<Calendar />} label="Data Richiesta" value={formatDate(socio.requestDate)} />
                       {socio.membershipStatus === 'active' && <DetailRow icon={<Calendar />} label="Data Ammissione" value={formatDate(socio.joinDate)} />}
                       <DetailRow icon={<Euro />} label="Quota Versata" value={formatCurrency(status === 'pending' ? 0 : socio.membershipFee)} />
                       {socio.isVolunteer && <DetailRow icon={<HandHeart />} label="Volontario" value="Sì" />}
                       <DetailRow icon={<StickyNote />} label="Note" value={socio.notes} />
                     </div>
                      <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="ghost">Chiudi</Button>
                          </DialogClose>
                           <Button onClick={() => onEdit(socio)}><Pencil className="mr-2 h-4 w-4" /> Modifica Dati</Button>
                      </DialogFooter>
                   </DialogContent>
                 </Dialog>
                 <div className="flex items-center gap-1">
                    <TooltipProvider>
                      {socio.qualifica?.map(q => (
                        <Tooltip key={q}>
                          <TooltipTrigger>
                            <span className={cn("font-bold text-lg", QUALIFICA_COLORS[q] || QUALIFICA_COLORS.default)}>*</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{q}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                  </div>
                 {socioIsMinor && (
                   <Dialog>
                     <DialogTrigger asChild>
                       <Badge onClick={(e) => { e.stopPropagation(); }} variant="outline" className="text-xs border-yellow-400 text-yellow-400 cursor-pointer hover:bg-yellow-500/10">Minore</Badge>
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
              <Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting}>
                <span className="sr-only">Apri menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
               <DropdownMenuItem onSelect={() => onEdit(socio)}>
                 <Pencil className="mr-2 h-4 w-4" /> Modifica
              </DropdownMenuItem>
              {status === 'pending' && (
                <DropdownMenuItem onSelect={() => setShowApproveDialog(true)} className="text-green-500 focus:text-green-400 focus:bg-green-500/10">
                    <CheckCircle className="mr-2 h-4 w-4" /> Approva
                </DropdownMenuItem>
              )}
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
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>Approva Socio e Completa Iscrizione</DialogTitle>
                <DialogDescription>
                    Stai per approvare {getFullName(socio)} come membro attivo. Completa i dati di tesseramento.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="membership-number" className="text-right">
                        N. Tessera
                    </Label>
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="text-muted-foreground text-sm">GMC-{new Date().getFullYear()}-</span>
                      <Input
                          id="membership-number"
                          value={newMemberNumber}
                          onChange={(e) => setNewMemberNumber(e.target.value)}
                          className="w-20"
                      />
                    </div>
                </div>
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Qualifiche</Label>
                    <div className="col-span-3 space-y-2">
                        {QUALIFICHE.map((q) => (
                           <div key={q} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`qualifica-${q}`} 
                                    checked={qualifiche.includes(q)}
                                    onCheckedChange={(checked) => handleQualificaChange(q, !!checked)}
                                />
                                <label htmlFor={`qualifica-${q}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {q}
                                </label>
                            </div>
                        ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="membership-fee" className="text-right">
                        Quota (€)
                    </Label>
                    <div className="col-span-3">
                      <Input
                          id="membership-fee"
                          type="number"
                          value={membershipFee}
                          onChange={(e) => setMembershipFee(Number(e.target.value))}
                          className="w-28"
                      />
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setShowApproveDialog(false)}>Annulla</Button>
                <Button onClick={handleApprove} disabled={isApproving}>
                    {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Conferma e Approva
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const SociTableComponent = ({ soci, onEdit, allMembers }: SociTableProps) => {
  const [filter, setFilter] = useState('');

  const filteredSoci = useMemo(() => soci.filter(socio => {
    if (!socio) return false;
    const fullName = getFullName(socio) || '';
    const email = socio.email || '';
    const tessera = socio.tessera || '';
    const searchString = filter.toLowerCase();
    
    return fullName.toLowerCase().includes(searchString) ||
           email.toLowerCase().includes(searchString) ||
           tessera.toLowerCase().includes(searchString);
  }), [soci, filter]);
  
  return (
    <div>
      <div className="flex items-center py-4">
        <div className="relative w-full max-w-sm">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtra per nome, email, tessera..."
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
                  allMembers={allMembers}
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

interface SociTableProps {
  soci: Socio[];
  onEdit: (socio: Socio) => void;
  allMembers: Socio[];
}

export const SociTable = SociTableComponent;

    