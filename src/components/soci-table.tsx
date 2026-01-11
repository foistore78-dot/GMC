
"use client";

import { useState, useMemo, useEffect, Dispatch, SetStateAction, useCallback } from "react";
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
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw, Pencil, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, HandHeart, Award, CircleDot, CheckCircle, Loader2, ArrowUpDown, FileLock2, ChevronLeft, ChevronRight, Printer, MessageCircle, Building, Cake, Trash2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { useFirestore } from "@/firebase";
import { doc, writeBatch, deleteDoc } from "firebase/firestore";
import { QUALIFICHE, isMinorCheck as isMinor } from "./edit-socio-form";

export const getFullName = (socio: any) => `${socio.lastName || ''} ${socio.firstName || ''}`.trim();

const isDate = (d: any): d is Date => d instanceof Date && !isNaN(d.valueOf());

const parseDate = (dateString: any): Date | null => {
    if (!dateString) return null;
    let date;

    if (dateString && typeof dateString.toDate === 'function') {
        date = dateString.toDate();
    } else if (typeof dateString === 'string') {
        date = new Date(dateString);
    } else if (dateString instanceof Date) {
        date = dateString;
    } else {
        return null;
    }
    
    return isDate(date) ? date : null;
}


const isExpired = (socio: Socio): boolean => {
    if (!socio.tessera) {
        return false;
    }

    const currentYear = new Date().getFullYear();
    const membershipYear = socio.membershipYear ? parseInt(socio.membershipYear, 10) : 0;
    
    if (membershipYear && membershipYear < currentYear) {
        return true;
    }

    const expirationDate = parseDate(socio.expirationDate);
    if (!expirationDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    return expirationDate < today;
};

export const getStatus = (socio: Socio): 'active' | 'pending' | 'rejected' | 'expired' => {
    if (socio.tessera) {
        return isExpired(socio) ? 'expired' : 'active';
    }
    return socio.status === 'rejected' ? 'rejected' : 'pending';
};


export const formatDate = (dateInput: any, outputFormat: string = 'dd/MM/yyyy') => {
    const date = parseDate(dateInput);
    if (!date) return '';

    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();

    if (outputFormat === 'yyyy-MM-dd') {
      return `${y}-${m}-${d}`;
    }
    
    return `${d}/${m}/${y}`;
};


const formatCurrency = (value: number | undefined | null) => {
    const number = value ?? 0;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(number);
}

const QUALIFICA_COLORS: Record<string, string> = {
  "FONDATORE": "text-yellow-400",
  "VOLONTARIO": "text-sky-400",
  "MUSICISTA": "text-fuchsia-400",
  "default": "text-gray-400",
};


const DetailItem = ({ icon, label, value, className }: { icon?: React.ReactNode, label: string, value?: string | number | null | React.ReactNode, className?: string }) => {
  if (!value && typeof value !== 'number' && typeof value !== 'object') return null;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {icon && <div className="text-primary mt-1">{icon}</div>}
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="font-medium text-sm leading-tight">{value}</div>
      </div>
    </div>
  );
};


const SocioTableRow = ({ 
  socio,
  onEdit,
  onPrint,
  allMembers,
  onSocioUpdate,
  activeTab,
}: { 
  socio: Socio; 
  onEdit: (socio: Socio) => void;
  onPrint: (socio: Socio) => void;
  allMembers: Socio[];
  onSocioUpdate: (tab?: 'active' | 'expired' | 'requests') => void;
  activeTab: 'active' | 'expired' | 'requests';
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveMemberNumber, setApproveMemberNumber] = useState("");
  const [approveMembershipFee, setApproveMembershipFee] = useState(10);
  const [approveQualifiche, setApproveQualifiche] = useState<string[]>([]);
  const [approveFeePaid, setApproveFeePaid] = useState(false);
  const [approvedSocioData, setApprovedSocioData] = useState<Socio | null>(null);

  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewalYear, setRenewalYear] = useState("");
  const [renewalFee, setRenewalFee] = useState(10);
  const [renewMemberNumber, setRenewMemberNumber] = useState("");
  const [renewQualifiche, setRenewQualifiche] = useState<string[]>([]);
  const [renewFeePaid, setRenewFeePaid] = useState(false);
  const [renewedSocioData, setRenewedSocioData] = useState<Socio | null>(null);

  const [socioToDelete, setSocioToDelete] = useState<Socio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const status = getStatus(socio);
  const socioIsMinor = isMinor(socio.birthDate);

  const resetApproveDialog = useCallback(() => {
    setShowApproveDialog(false);
    setIsApproving(false);
    setApprovedSocioData(null);
  }, []);
  
  const resetRenewDialog = useCallback(() => {
      setShowRenewDialog(false);
      setIsRenewing(false);
      setRenewedSocioData(null);
  }, []);

  const handleApproveDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetApproveDialog();
      if (approvedSocioData) {
        onSocioUpdate('active');
      }
    } else {
        setShowApproveDialog(true);
    }
  };
  
  const handleRenewDialogChange = (isOpen: boolean) => {
     if (!isOpen) {
        resetRenewDialog();
        if (renewedSocioData) {
            onSocioUpdate('expired');
        }
    } else {
        setShowRenewDialog(true);
    }
  };
  
  const handleDelete = async () => {
    if (!firestore || !socioToDelete) return;
    setIsDeleting(true);

    try {
        const socioStatus = getStatus(socioToDelete);
        const collectionName = (socioStatus === 'active' || socioStatus === 'expired') ? 'members' : 'membership_requests';
        const docRef = doc(firestore, collectionName, socioToDelete.id);
        
        await deleteDoc(docRef);

        toast({
            title: "Socio Eliminato",
            description: `${getFullName(socioToDelete)} è stato rimosso dall'elenco.`,
        });
        
        onSocioUpdate();
    } catch (error) {
        toast({
            title: "Errore di Eliminazione",
            description: `Impossibile eliminare ${getFullName(socioToDelete)}. Dettagli: ${(error as Error).message}`,
            variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
        setSocioToDelete(null);
    }
  };

  const getNextMemberNumberForYear = useCallback((year: number) => {
      const yearMemberNumbers = allMembers
        .filter(m => m.membershipYear === String(year) && m.tessera)
        .map(m => parseInt(m.tessera!.split('-')[2], 10))
        .filter(n => !isNaN(n));
      
      const maxNumber = yearMemberNumbers.length > 0 ? Math.max(...yearMemberNumbers) : 0;
      return maxNumber + 1;
  }, [allMembers]);


  useEffect(() => {
    if (showApproveDialog) {
      const currentYear = new Date().getFullYear();
      const nextNumber = getNextMemberNumberForYear(currentYear);
      
      setApproveMemberNumber(String(nextNumber));
      setApproveMembershipFee(socioIsMinor ? 0 : 10);
      setApproveQualifiche(socio.qualifica || []);
      setApproveFeePaid(false);
    }
  }, [showApproveDialog, getNextMemberNumberForYear, socioIsMinor, socio.qualifica]);

   useEffect(() => {
    if (showRenewDialog) {
      const currentYear = new Date().getFullYear();
      const nextNumber = getNextMemberNumberForYear(currentYear);

      setRenewalYear(String(currentYear));
      setRenewMemberNumber(String(nextNumber));
      setRenewQualifiche(socio.qualifica || []);
      setRenewalFee(socioIsMinor ? 0 : 10);
      setRenewFeePaid(false);
    }
  }, [showRenewDialog, getNextMemberNumberForYear, socioIsMinor, socio.qualifica]);


  const handleApprove = async () => {
    if (!firestore || isApproving || !approveFeePaid) return;

    setIsApproving(true);
    const currentYear = new Date().getFullYear();
    const membershipCardNumber = `GMC-${currentYear}-${approveMemberNumber}`;

    const batch = writeBatch(firestore);

    const requestDocRef = doc(firestore, "membership_requests", socio.id);
    const memberDocRef = doc(firestore, "members", socio.id);

    const { status, ...restOfSocio } = socio;
    
    const newMemberData: Socio = {
        ...restOfSocio,
        id: socio.id,
        joinDate: new Date().toISOString(),
        status: 'active' as const,
        expirationDate: new Date(currentYear, 11, 31).toISOString(),
        membershipYear: String(currentYear),
        tessera: membershipCardNumber,
        membershipFee: approveMembershipFee,
        qualifica: approveQualifiche,
        requestDate: socio.requestDate || new Date().toISOString(),
        notes: socio.notes || '', // Carry over existing notes from request
    };

    batch.set(memberDocRef, newMemberData, { merge: true });
    batch.delete(requestDocRef);

    try {
        await batch.commit();
        toast({
            title: "Socio Approvato!",
            description: `${getFullName(socio)} è ora un membro attivo. N. tessera: ${membershipCardNumber}`,
        });
        onPrint(newMemberData);
        handleApproveDialogChange(false);
        onSocioUpdate('active');
    } catch (error) {
        toast({
            title: "Errore di Approvazione",
            description: `Impossibile approvare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: "destructive",
        });
        setIsApproving(false);
    } 
  };
  
const handleRenew = async () => {
    if (!firestore || isRenewing || !renewFeePaid) return;
    setIsRenewing(true);

    try {
        const memberDocRef = doc(firestore, 'members', socio.id);
        const renewalDateISO = new Date().toISOString();
        const newTessera = `GMC-${renewalYear}-${renewMemberNumber}`;
        const oldNotes = socio.notes || '';
        
        const renewalNote = `--- RINNOVO ${formatDate(renewalDateISO)} ---\nAnno: ${renewalYear}. Tessera precedente anno ${socio.membershipYear || 'N/A'}: ${socio.tessera || 'N/A'}. Quota versata: ${formatCurrency(renewalFee)}.`;
        
        const newNotes = `${renewalNote}\n\n${oldNotes}`.trim();

        const updatedData = {
            renewalDate: renewalDateISO,
            expirationDate: new Date(parseInt(renewalYear, 10), 11, 31).toISOString(),
            membershipYear: renewalYear,
            membershipFee: renewalFee,
            qualifica: renewQualifiche,
            tessera: newTessera,
            notes: newNotes,
        };

        const batch = writeBatch(firestore);
        batch.update(memberDocRef, updatedData);
        await batch.commit();

        const newlyRenewedSocio = { ...socio, ...updatedData };
        
        toast({
            title: 'Rinnovo Effettuato!',
            description: `Il tesseramento di ${getFullName(socio)} è stato rinnovato. Nuova tessera: ${newTessera}.`,
        });
        
        setRenewedSocioData(newlyRenewedSocio);
      
    } catch (error) {
        toast({
            title: 'Errore di Rinnovo',
            description: `Impossibile rinnovare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: 'destructive',
        });
        setIsRenewing(false);
    }
};

  
  const handleQualificaChange = (qualifica: string, checked: boolean, stateSetter: Dispatch<SetStateAction<string[]>>) => {
    stateSetter(prev => 
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };
  
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!socio.phone) {
        toast({
            title: "Numero non presente",
            description: "Questo socio non ha fornito un numero di telefono.",
            variant: "destructive",
        });
        return;
    }
    const groupInviteLink = "https://chat.whatsapp.com/KKes4gzve7T8xET9OD3bm5";
    const message = `Ciao ${socio.firstName}! Benvenuto/a nel Garage Music Club. Questo è il link per unirti al nostro gruppo WhatsApp ufficiale e rimanere aggiornato su tutte le attività: ${groupInviteLink}`;
    
    const cleanedPhone = socio.phone.replace(/\D/g, '');
    const finalPhone = cleanedPhone.startsWith('39') ? cleanedPhone : `39${cleanedPhone}`;

    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const tesseraDisplayDesktop = socio.tessera ? `${socio.tessera.split('-')[1]}-${socio.tessera.split('-')[2]}` : '-';
  const tesseraDisplayMobile = socio.tessera ? socio.tessera.split('-').pop() : '-';

  const contextualDate = useMemo(() => {
    if (activeTab === 'active') return socio.renewalDate || socio.joinDate;
    if (activeTab === 'expired') return socio.joinDate;
    if (activeTab === 'requests') return socio.requestDate;
    return undefined;
  }, [activeTab, socio]);

  return (
    <>
      <TableRow className={cn("text-xs sm:text-sm", { 'bg-yellow-500/10 hover:bg-yellow-500/20': status === 'expired' })}>
        {activeTab !== 'requests' && (
            <>
                <TableCell className="font-mono sm:hidden w-12 text-center text-muted-foreground">
                {tesseraDisplayMobile}
                </TableCell>
                <TableCell className="font-mono hidden sm:table-cell">
                {tesseraDisplayDesktop}
                </TableCell>
            </>
        )}
        <TableCell className="font-medium">
           <div className="flex items-center gap-3 flex-wrap">
              <span className="transition-colors">{getFullName(socio)}</span>
                 <div className="flex items-center gap-1">
                    {socio.whatsappConsent && (
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <button onClick={handleWhatsAppClick} className="text-green-500 hover:text-green-400">
                               <MessageCircle className="h-4 w-4" />
                               <span className="sr-only">Invia invito WhatsApp</span>
                             </button>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Invia invito al gruppo WhatsApp</p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                    )}
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
                         <DetailItem icon={<User />} label="Nome Tutore" value={`${socio.guardianFirstName} ${socio.guardianLastName}`} />
                         <DetailItem icon={<Calendar />} label="Data di Nascita Tutore" value={formatDate(socio.guardianBirthDate)} />
                       </div>
                     </DialogContent>
                   </Dialog>
                 )}
           </div>
        </TableCell>
        <TableCell className="hidden md:table-cell text-muted-foreground">
          <div>{formatDate(socio.birthDate)}</div>
          <div className="text-xs">{socio.birthPlace}</div>
        </TableCell>
        <TableCell className="text-muted-foreground">{formatDate(contextualDate)}</TableCell>
        <TableCell className="text-right space-x-1">
            <div className="sm:hidden flex items-center justify-end">
                {status === 'pending' && (
                    <Dialog open={showApproveDialog} onOpenChange={handleApproveDialogChange}>
                        <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-500 hover:bg-green-500/10 h-8">
                            <CheckCircle className="h-4 w-4" />
                        </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Approva Socio e Completa Iscrizione</DialogTitle>
                                <DialogDescription>
                                    Stai per approvare <strong className="text-foreground">{getFullName(socio)}</strong> come membro attivo. Completa i dati di tesseramento.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                    <Label htmlFor="membership-number-mob" className="sm:text-right">
                                        N. Tessera
                                    </Label>
                                    <div className="col-span-3">
                                    <Input
                                        id="membership-number-mob"
                                        value={`GMC-${new Date().getFullYear()}-${approveMemberNumber}`}
                                        onChange={(e) => {
                                            const parts = e.target.value.split('-');
                                            setApproveMemberNumber(parts[parts.length - 1] || '');
                                        }}
                                        className="w-40"
                                    />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                                    <Label className="sm:text-right pt-2">Qualifiche</Label>
                                    <div className="col-span-3 space-y-2">
                                        {QUALIFICHE.map((q) => (
                                            <div key={q} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`qualifica-${q}-approve-mob`} 
                                                    checked={approveQualifiche.includes(q)}
                                                    onCheckedChange={(checked) => handleQualificaChange(q, !!checked, setApproveQualifiche)}
                                                />
                                                <label htmlFor={`qualifica-${q}-approve-mob`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {q}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                    <Label htmlFor="membership-fee-mob" className="sm:text-right">
                                        Quota (€)
                                    </Label>
                                    <div className="col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <Input
                                        id="membership-fee-mob"
                                        type="number"
                                        value={approveMembershipFee}
                                        onChange={(e) => setApproveMembershipFee(Number(e.target.value))}
                                        className="w-28"
                                    />
                                        <div className="flex items-center space-x-2">
                                        <Checkbox id="fee-paid-approve-mob" checked={approveFeePaid} onCheckedChange={(checked) => setApproveFeePaid(!!checked)} />
                                        <Label htmlFor="fee-paid-approve-mob" className="text-sm font-medium">Quota Versata</Label>
                                    </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => handleApproveDialogChange(false)}>Annulla</Button>
                                <Button onClick={handleApprove} disabled={isApproving || !approveFeePaid}>
                                    {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Conferma e Stampa
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                {status === 'expired' && (
                     <Dialog open={showRenewDialog} onOpenChange={handleRenewDialogChange}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-500 hover:bg-orange-500/10 h-8">
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                        </DialogContent>
                    </Dialog>
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Altre azioni</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onPrint(socio)}>
                            <Printer className="mr-2 h-4 w-4" />
                            <span>Stampa</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(socio)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Modifica</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSocioToDelete(socio)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Elimina</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="hidden sm:flex items-center justify-end">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPrint(socio)}>
                                <Printer className="h-4 w-4" />
                                <span className="sr-only">Stampa Scheda</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Stampa Scheda</TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(socio)}>
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Modifica</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modifica</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                
                <AlertDialog open={!!socioToDelete} onOpenChange={(open) => !open && setSocioToDelete(null)}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" onClick={() => setSocioToDelete(socio)}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Elimina</span>
                                    </Button>
                                </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Elimina</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Sei sicuro di voler eliminare questo socio?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Stai per eliminare <strong className="text-foreground">{socioToDelete ? getFullName(socioToDelete) : ""}</strong>. Questa azione non può essere annullata.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className={buttonVariants({ variant: "destructive" })}>
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isDeleting ? 'Eliminazione...' : 'Elimina'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {status === 'pending' && (
                <Dialog open={showApproveDialog} onOpenChange={handleApproveDialogChange}>
                    <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-500 hover:bg-green-500/10 h-8">
                        <CheckCircle className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Approva</span>
                    </Button>
                    </DialogTrigger>
                     <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Approva Socio e Completa Iscrizione</DialogTitle>
                            <DialogDescription>
                                Stai per approvare <strong className="text-foreground">{getFullName(socio)}</strong> come membro attivo. Completa i dati di tesseramento.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label htmlFor="membership-number" className="sm:text-right">
                                    N. Tessera
                                </Label>
                                <div className="col-span-3">
                                <Input
                                    id="membership-number"
                                    value={`GMC-${new Date().getFullYear()}-${approveMemberNumber}`}
                                    onChange={(e) => {
                                        const parts = e.target.value.split('-');
                                        setApproveMemberNumber(parts[parts.length - 1] || '');
                                    }}
                                    className="w-40"
                                />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                                <Label className="sm:text-right pt-2">Qualifiche</Label>
                                <div className="col-span-3 space-y-2">
                                    {QUALIFICHE.map((q) => (
                                        <div key={q} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`qualifica-${q}-approve`} 
                                                checked={approveQualifiche.includes(q)}
                                                onCheckedChange={(checked) => handleQualificaChange(q, !!checked, setApproveQualifiche)}
                                            />
                                            <label htmlFor={`qualifica-${q}-approve`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {q}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label htmlFor="membership-fee" className="sm:text-right">
                                    Quota (€)
                                </Label>
                                <div className="col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <Input
                                    id="membership-fee"
                                    type="number"
                                    value={approveMembershipFee}
                                    onChange={(e) => setApproveMembershipFee(Number(e.target.value))}
                                    className="w-28"
                                />
                                    <div className="flex items-center space-x-2">
                                    <Checkbox id="fee-paid-approve" checked={approveFeePaid} onCheckedChange={(checked) => setApproveFeePaid(!!checked)} />
                                    <Label htmlFor="fee-paid-approve" className="text-sm font-medium">Quota Versata</Label>
                                </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => handleApproveDialogChange(false)}>Annulla</Button>
                            <Button onClick={handleApprove} disabled={isApproving || !approveFeePaid}>
                                {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Conferma e Stampa
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                )}
                {status === 'expired' && (
                <Dialog open={showRenewDialog} onOpenChange={handleRenewDialogChange}>
                    <DialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-orange-500 hover:text-orange-500 hover:bg-orange-500/10 h-8"
                        >
                            <RefreshCw className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Rinnova</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        {renewedSocioData ? (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Rinnovo Completato!</DialogTitle>
                                    <DialogDescription>
                                        L'iscrizione di <strong className="text-foreground">{getFullName(renewedSocioData)}</strong> è stata rinnovata per l'anno {renewedSocioData.membershipYear}.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 text-center">
                                    <p className="text-sm">Nuova tessera:</p>
                                    <p className="font-bold text-lg text-primary">{renewedSocioData.tessera}</p>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => handleRenewDialogChange(false)}>Chiudi</Button>
                                    <Button onClick={() => { onPrint(renewedSocioData); handleRenewDialogChange(false); }}>
                                        <Printer className="mr-2 h-4 w-4" /> Stampa Scheda
                                    </Button>
                                </DialogFooter>
                            </>
                        ) : (
                            <>
                                <DialogHeader>
                                    <DialogTitle>Rinnova Tesseramento</DialogTitle>
                                    <DialogDescription>
                                        Stai rinnovando il tesseramento per <strong className="text-foreground">{getFullName(socio)}</strong> per l'anno <strong className="text-foreground">{renewalYear}</strong>.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-6 py-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                        <Label htmlFor="renewal-member-number" className="sm:text-right">
                                            N. Tessera
                                        </Label>
                                        <div className="col-span-3">
                                          <Input
                                              id="renewal-member-number"
                                              value={`GMC-${renewalYear}-${renewMemberNumber}`}
                                              onChange={(e) => {
                                                  const parts = e.target.value.split('-');
                                                  setRenewMemberNumber(parts[parts.length - 1] || '');
                                              }}
                                              className="w-40"
                                          />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                                        <Label className="sm:text-right pt-2">Qualifiche</Label>
                                        <div className="col-span-3 space-y-2">
                                            {QUALIFICHE.map((q) => (
                                              <div key={q} className="flex items-center space-x-2">
                                                    <Checkbox 
                                                        id={`qualifica-${q}-renew`} 
                                                        checked={renewQualifiche.includes(q)}
                                                        onCheckedChange={(checked) => handleQualificaChange(q, !!checked, setRenewQualifiche)}
                                                    />
                                                    <label htmlFor={`qualifica-${q}-renew`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                        {q}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                        <Label htmlFor="renewal-fee" className="sm:text-right">
                                            Quota (€)
                                        </Label>
                                        <div className="col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                          <Input
                                              id="renewal-fee"
                                              type="number"
                                              value={renewalFee}
                                              onChange={(e) => setRenewalFee(Number(e.target.value))}
                                              className="w-28"
                                          />
                                          <div className="flex items-center space-x-2">
                                              <Checkbox id="fee-paid-renew" checked={renewFeePaid} onCheckedChange={(checked) => setRenewFeePaid(!!checked)} />
                                              <Label htmlFor="fee-paid-renew" className="text-sm font-medium">Quota Versata</Label>
                                          </div>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => handleRenewDialogChange(false)}>Annulla</Button>
                                    <Button onClick={handleRenew} disabled={isRenewing || !renewFeePaid}>
                                        {isRenewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Conferma Rinnovo
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                </Dialog>
                )}
            </div>
        </TableCell>
      </TableRow>
      </>
  );
};


export type SortConfig = {
  key: keyof Socio | 'name' | 'tessera' | 'contextualDate';
  direction: 'ascending' | 'descending';
};

interface SociTableProps {
  soci: Socio[];
  onEdit: (socio: Socio) => void;
  onPrint: (socio: Socio) => void;
  allMembers: Socio[];
  sortConfig: SortConfig;
  setSortConfig: Dispatch<SetStateAction<SortConfig>>;
  onSocioUpdate: (tab?: 'active' | 'expired' | 'requests') => void;
  activeTab: 'active' | 'expired' | 'requests';
}

const SortableHeader = ({
  label,
  sortKey,
  sortConfig,
  setSortConfig,
  className,
}: {
  label: string;
  sortKey: SortConfig['key'];
  sortConfig: SortConfig;
  setSortConfig: Dispatch<SetStateAction<SortConfig>>;
  className?: string;
}) => {
  const isCurrentSortKey = sortConfig.key === sortKey;
  const direction = isCurrentSortKey ? sortConfig.direction : 'none';

  const handleSort = () => {
    let newDirection: 'ascending' | 'descending' = 'ascending';
    if (isCurrentSortKey && sortConfig.direction === 'ascending') {
      newDirection = 'descending';
    }
    setSortConfig({ key: sortKey, direction: newDirection });
  };

  return (
    <TableHead className={className}>
      <Button variant="ghost" onClick={handleSort} className="px-2 py-1 h-auto -ml-2">
        {label}
        <ArrowUpDown className={cn("ml-2 h-4 w-4", direction === 'none' && "text-muted-foreground/50")} />
      </Button>
    </TableHead>
  );
};

export const SociTable = ({ 
  soci, 
  onEdit, 
  onPrint,
  allMembers, 
  onSocioUpdate,
  sortConfig, 
  setSortConfig, 
  activeTab,
}: SociTableProps) => {

  const dateHeaderLabel = useMemo(() => {
    if (activeTab === 'active') return 'Rinnovo/Amm.';
    if (activeTab === 'expired') return 'Ammissione';
    if (activeTab === 'requests') return 'Richiesta';
    return 'Data';
  }, [activeTab]);


  return (
    <div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {activeTab !== 'requests' && (
                <>
                    <SortableHeader label="N." sortKey="tessera" sortConfig={sortConfig} setSortConfig={setSortConfig} className="sm:hidden w-12" />
                    <SortableHeader label="Tessera" sortKey="tessera" sortConfig={sortConfig} setSortConfig={setSortConfig} className="w-[100px] hidden sm:table-cell" />
                </>
              )}
              <SortableHeader label="Nome" sortKey="name" sortConfig={sortConfig} setSortConfig={setSortConfig} className={cn(activeTab === 'requests' && 'pl-4 sm:pl-6')} />
              <SortableHeader label="Nascita" sortKey="birthDate" sortConfig={sortConfig} setSortConfig={setSortConfig} className="hidden md:table-cell" />
              <SortableHeader label={dateHeaderLabel} sortKey="contextualDate" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {soci.length > 0 ? (
              soci.map((socio) => (
                <SocioTableRow 
                  key={socio.id} 
                  socio={socio}
                  onEdit={onEdit}
                  onPrint={onPrint}
                  allMembers={allMembers}
                  onSocioUpdate={onSocioUpdate}
                  activeTab={activeTab}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
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

    
