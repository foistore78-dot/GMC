
"use client";

import { useState, useMemo, useEffect, Dispatch, SetStateAction, useCallback, memo } from "react";
import { Socio, QUALIFICHE, QUALIFICA_COLORS } from "@/lib/soci-data";
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
import { RefreshCw, Pencil, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, Award, CheckCircle, Loader2, ArrowUpDown, FileLock2, Printer, MessageCircle, Cake, Trash2, MoreVertical, MapPin, UserCheck, Info, AlertTriangle, Users } from "lucide-react";
import { cn, getFullName, getStatus, formatDate, formatCurrency, isMinorCheck as isMinor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { useFirestore, deleteDocumentNonBlocking } from "@/firebase";
import { doc, writeBatch, getDoc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

const DetailItem = memo(({ icon, label, value, className }: { icon?: React.ReactNode, label: string, value?: string | number | null | React.ReactNode, className?: string }) => {
  if (!value && typeof value !== 'number' && typeof value !== 'object') return null;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {icon && <div className="text-primary mt-1">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <div className="font-medium text-sm leading-tight break-words">{value}</div>
      </div>
    </div>
  );
});

DetailItem.displayName = "DetailItem";

const SocioTableRow = memo(({ 
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

  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const status = useMemo(() => getStatus(socio, activeTab !== 'requests'), [socio, activeTab]);
  const socioIsMinor = useMemo(() => isMinor(socio.birthDate), [socio.birthDate]);
  
  // Logic to distinguish new members from renewals
  const isRenewedMember = activeTab === 'active' && !!socio.renewalDate;
  const isNewMember = activeTab === 'active' && !socio.renewalDate && !!socio.joinDate;

  const potentialDuplicate = useMemo(() => {
    if (activeTab !== 'requests') return null;
    return allMembers.find(m => 
      m.firstName.toLowerCase().trim() === socio.firstName.toLowerCase().trim() &&
      m.lastName.toLowerCase().trim() === socio.lastName.toLowerCase().trim() &&
      m.birthDate === socio.birthDate
    );
  }, [allMembers, socio.firstName, socio.lastName, socio.birthDate, activeTab]);

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
            onSocioUpdate('active');
        }
    } else {
        setShowRenewDialog(true);
    }
  };
  
  const handleDelete = () => {
    if (!firestore || !socioToDelete) return;
    setIsDeleting(true);

    const collectionName = (activeTab === 'active' || activeTab === 'expired') ? 'members' : 'membership_requests';
    const docRef = doc(firestore, collectionName, socioToDelete.id);
    
    deleteDocumentNonBlocking(docRef);

    toast({
        title: "Socio Eliminato",
        description: `${getFullName(socioToDelete)} è stato rimosso dall'elenco.`,
    });
    
    setSocioToDelete(null);
    setIsDeleting(false);
    onSocioUpdate();
  };

  const getNextMemberNumberForYear = useCallback((year: number) => {
      const yearMemberNumbers = allMembers
        .filter(m => m.membershipYear === String(year) && m.tessera)
        .map(m => parseInt(String(m.tessera!).split('-').pop() || '0', 10))
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

  const handleApprove = () => {
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
        notes: socio.notes || '', 
    };

    batch.set(memberDocRef, newMemberData, { merge: true });
    batch.delete(requestDocRef);

    batch.commit().then(() => {
        toast({
            title: "Socio Approvato!",
            description: `${getFullName(socio)} è ora un membro attivo. N. tessera: ${membershipCardNumber}`,
        });
        onPrint(newMemberData);
        handleApproveDialogChange(false);
        onSocioUpdate('active');
    }).catch((error) => {
        toast({
            title: "Errore di Approvazione",
            description: `Impossibile approvare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: "destructive",
        });
        setIsApproving(false);
    });
  };
  
const handleRenew = () => {
    if (!firestore || isRenewing || !renewFeePaid) return;
    setIsRenewing(true);

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
    
    batch.commit().then(() => {
        const newlyRenewedSocio = { ...socio, ...updatedData };
        toast({
            title: 'Rinnovo Effettuato!',
            description: `Il tesseramento di ${getFullName(socio)} è stato rinnovato. Nuova tessera: ${newTessera}.`,
        });
        setRenewedSocioData(newlyRenewedSocio);
    }).catch((error) => {
        toast({
            title: 'Errore di Rinnovo',
            description: `Impossibile rinnovare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: 'destructive',
        });
        setIsRenewing(false);
    });
};

  const handleQualificaChange = (qualifica: string, checked: boolean, stateSetter: Dispatch<SetStateAction<string[]>>) => {
    stateSetter(prev => 
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };
  
  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!socio.phone) {
        toast({
            title: "Numero non presente",
            description: "Questo socio non ha fornito un numero di telefono.",
            variant: "destructive",
        });
        return;
    }

    if (!firestore) return;
    
    try {
      const snap = await getDoc(doc(firestore, "settings", "general"));
      if (snap.exists()) {
        setConfig(snap.data());
        setShowWhatsAppDialog(true);
      } else {
        toast({
          title: "Configurazione mancante",
          description: "Configura i link WhatsApp nelle impostazioni.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendInvite = (groupLink: string) => {
    const message = `Ciao ${socio.firstName}! Benvenuto/a nel Garage Music Club. Questo è il link per unirti al nostro gruppo WhatsApp ufficiale e rimanere aggiornato su tutte le attività: ${groupLink}`;
    
    const cleanedPhone = String(socio.phone).replace(/\D/g, '');
    const finalPhone = cleanedPhone.startsWith('39') ? cleanedPhone : `39${cleanedPhone}`;

    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setShowWhatsAppDialog(false);
  };

  const tesseraDisplayDesktop = socio.tessera ? `${String(socio.tessera).split('-')[1] || ''}-${String(socio.tessera).split('-')[2] || ''}` : '-';
  const tesseraDisplayMobile = socio.tessera ? String(socio.tessera).split('-').pop() : '-';

  const contextualDate = useMemo(() => {
    if (activeTab === 'active') return socio.renewalDate || socio.joinDate;
    if (activeTab === 'expired') return socio.joinDate;
    if (activeTab === 'requests') return socio.requestDate;
    return undefined;
  }, [activeTab, socio]);

  if (!mounted) {
    return (
      <TableRow className="text-xs sm:text-sm">
        {activeTab !== 'requests' && (
          <>
            <TableCell className="w-12 text-center">-</TableCell>
            <TableCell className="hidden sm:table-cell">-</TableCell>
          </>
        )}
        <TableCell className="font-medium">{getFullName(socio)}</TableCell>
        <TableCell className="hidden md:table-cell">-</TableCell>
        <TableCell>-</TableCell>
        <TableCell className="text-right">-</TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TableRow className={cn(
        "text-xs sm:text-sm transition-all duration-300", 
        status === 'expired' && 'bg-yellow-500/10 hover:bg-yellow-500/20',
        isRenewedMember && 'bg-indigo-500/10 hover:bg-indigo-500/20', // Rinnovo (Indaco)
        isNewMember && 'bg-emerald-500/10 hover:bg-emerald-500/20'     // Nuovo (Smeraldo)
      )}>
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
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-left hover:text-primary transition-colors cursor-pointer group flex items-center gap-2">
                    <span className="font-bold underline decoration-primary/30 group-hover:decoration-primary">{getFullName(socio)}</span>
                    <Info className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader className="pb-4">
                    <div className="flex items-center justify-between gap-4">
                      <DialogTitle className="text-2xl font-headline tracking-wide text-primary">
                        {getFullName(socio)}
                      </DialogTitle>
                      <Badge className={cn(
                        "capitalize",
                        status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                        status === 'expired' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                        'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      )}>
                        {status === 'active' ? 'Attivo' : status === 'expired' ? 'Scaduto' : 'Richiesta'}
                      </Badge>
                    </div>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">
                        <User className="h-4 w-4" /> Anagrafica
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <DetailItem label="Data di Nascita" value={formatDate(socio.birthDate)} icon={<Cake className="h-4 w-4" />} />
                        <DetailItem label="Luogo di Nascita" value={socio.birthPlace} icon={<MapPin className="h-4 w-4" />} />
                        <DetailItem label="Codice Fiscale" value={socio.fiscalCode || 'Non inserito'} icon={<Hash className="h-4 w-4" />} />
                        <DetailItem label="Genere" value={socio.gender === 'male' ? 'Maschio' : 'Femmina'} icon={<UserCheck className="h-4 w-4" />} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">
                        <Phone className="h-4 w-4" /> Contatti e Residenza
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <DetailItem label="Email" value={socio.email || 'Nessuna email'} icon={<Mail className="h-4 w-4" />} />
                        <DetailItem label="Telefono" value={socio.phone || 'Nessun telefono'} icon={<Phone className="h-4 w-4" />} />
                        <DetailItem label="Residenza" value={`${socio.address}, ${socio.postalCode} ${socio.city} (${socio.province})`} icon={<Home className="h-4 w-4" />} />
                        <DetailItem label="Gruppo WhatsApp" value={socio.whatsappConsent ? 'Consenso fornito' : 'Consenso negato'} icon={<MessageCircle className="h-4 w-4" />} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">
                        <ShieldCheck className="h-4 w-4" /> Tesseramento
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <DetailItem label="N. Tessera" value={socio.tessera || 'N/A'} icon={<Hash className="h-4 w-4" />} />
                        <DetailItem label="Anno Associativo" value={socio.membershipYear || 'N/A'} icon={<Calendar className="h-4 w-4" />} />
                        <DetailItem label="Data Ammissione" value={formatDate(socio.joinDate) || 'N/A'} icon={<CheckCircle className="h-4 w-4" />} />
                        <DetailItem label="Ultimo Rinnovo" value={formatDate(socio.renewalDate) || 'Nessun rinnovo'} icon={<RefreshCw className="h-4 w-4" />} />
                        <DetailItem label="Scadenza" value={formatDate(socio.expirationDate) || 'N/A'} icon={<FileLock2 className="h-4 w-4" />} />
                        <DetailItem label="Quota Versata" value={formatCurrency(socio.membershipFee)} icon={<Euro className="h-4 w-4" />} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-widest border-b pb-1">
                        <Award className="h-4 w-4" /> Qualifiche e Note
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        <DetailItem label="Qualifiche" value={socio.qualifica?.length ? (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {socio.qualifica.map(q => (
                              <Badge key={q} variant="secondary" className="text-[10px] py-0">{q}</Badge>
                            ))}
                          </div>
                        ) : 'Nessuna qualifica'} icon={<Award className="h-4 w-4" />} />
                        
                        {socioIsMinor && (
                          <DetailItem label="Tutore Legale" value={`${socio.guardianFirstName} ${socio.guardianLastName}`} icon={<ShieldCheck className="h-4 w-4 text-yellow-500" />} />
                        )}

                        <DetailItem label="Note Amministrative" value={socio.notes || 'Nessuna nota'} icon={<StickyNote className="h-4 w-4" />} />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6 border-t pt-4">
                    <Button variant="outline" onClick={() => onPrint(socio)} className="gap-2">
                      <Printer className="h-4 w-4" /> Stampa Scheda
                    </Button>
                    <Button onClick={() => onEdit(socio)} className="gap-2">
                      <Pencil className="h-4 w-4" /> Modifica Dati
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

                 <div className="flex items-center gap-1">
                    {isRenewedMember && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1 bg-indigo-400/10 text-indigo-300 border-indigo-400/30 font-bold tracking-tight uppercase">
                        Rinnovo
                      </Badge>
                    )}
                    {isNewMember && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1 bg-emerald-400/10 text-emerald-300 border-emerald-400/30 font-bold tracking-tight uppercase">
                        Nuovo
                      </Badge>
                    )}
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
            <div className="flex items-center justify-end">
                {activeTab === 'requests' && (
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
                                    Stai per approvare <strong className="text-foreground">{getFullName(socio)}</strong> come membro attivo.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                {potentialDuplicate && (
                                  <Alert variant="destructive" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Possibile Duplicato!</AlertTitle>
                                    <AlertDescription>
                                      Un socio con lo stesso nome, cognome e data di nascita è già presente (Tessera: {potentialDuplicate.tessera || 'N/A'}).
                                    </AlertDescription>
                                  </Alert>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                    <Label htmlFor="membership-number" className="sm:text-right">N. Tessera</Label>
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
                                                <label htmlFor={`qualifica-${q}-approve`} className="text-sm font-medium leading-none">
                                                    {q}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                    <Label htmlFor="membership-fee" className="sm:text-right">Quota (€)</Label>
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
                {activeTab === 'expired' && (
                     <Dialog open={showRenewDialog} onOpenChange={handleRenewDialogChange}>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-500 hover:bg-orange-500/10 h-8">
                                <RefreshCw className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Rinnova</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Rinnova Tesseramento</DialogTitle>
                                <DialogDescription>
                                    Stai rinnovando il tesseramento per <strong className="text-foreground">{getFullName(socio)}</strong>.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                    <Label htmlFor="renewal-year" className="sm:text-right">Anno</Label>
                                    <Input id="renewal-year" value={renewalYear} onChange={(e) => setRenewalYear(e.target.value)} className="w-28 col-span-3" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                    <Label htmlFor="renew-tessera" className="sm:text-right">N. Tessera</Label>
                                    <div className="col-span-3">
                                        <Input
                                            id="renew-tessera"
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
                                                <label htmlFor={`qualifica-${q}-renew`} className="text-sm font-medium leading-none">
                                                    {q}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                    <Label htmlFor="renewal-fee" className="sm:text-right">Quota (€)</Label>
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
                                    Conferma Rinnovo e Stampa
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onPrint(socio)}>
                            <Printer className="mr-2 h-4 w-4" /> Stampa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(socio)}>
                            <Pencil className="mr-2 h-4 w-4" /> Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSocioToDelete(socio)} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Elimina
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </TableCell>
      </TableRow>

      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="text-green-500" /> Seleziona Gruppo WhatsApp
            </DialogTitle>
            <DialogDescription>
              Scegli a quale gruppo inviare l'invito per <strong>{getFullName(socio)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              onClick={() => sendInvite(config?.whatsAppInviteLink1)} 
              variant="outline" 
              className="h-16 justify-start gap-4 border-primary/20 hover:bg-primary/10"
              disabled={!config?.whatsAppInviteLink1}
            >
              <div className="bg-primary/20 p-2 rounded-full"><Users className="w-6 h-6 text-primary" /></div>
              <div className="text-left">
                <div className="font-bold">Gruppo 1</div>
                <div className="text-xs text-muted-foreground truncate max-w-[250px]">{config?.whatsAppInviteLink1 || 'Non configurato'}</div>
              </div>
            </Button>
            <Button 
              onClick={() => sendInvite(config?.whatsAppInviteLink2)} 
              variant="outline" 
              className="h-16 justify-start gap-4 border-accent/20 hover:bg-accent/10"
              disabled={!config?.whatsAppInviteLink2}
            >
              <div className="bg-accent/20 p-2 rounded-full"><Users className="w-6 h-6 text-accent" /></div>
              <div className="text-left">
                <div className="font-bold">Gruppo 2</div>
                <div className="text-xs text-muted-foreground truncate max-w-[250px]">{config?.whatsAppInviteLink2 || 'Non configurato'}</div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowWhatsAppDialog(false)}>Annulla</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!socioToDelete} onOpenChange={(open) => !open && setSocioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Questo eliminerà permanentemente il socio <strong className="text-foreground">{socioToDelete ? getFullName(socioToDelete) : ""}</strong> e rimuoverà i suoi dati dai nostri server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDelete()}
              className={buttonVariants({ variant: "destructive" })}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {isDeleting ? "Eliminazione..." : "Conferma Eliminazione"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
  );
});

SocioTableRow.displayName = "SocioTableRow";

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
                <TableCell colSpan={activeTab === 'requests' ? 4 : 6} className="h-24 text-center text-muted-foreground">
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
