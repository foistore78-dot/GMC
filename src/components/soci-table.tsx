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
import { Button } from "@/components/ui/button";
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
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Pencil, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, HandHeart, Award, CircleDot, CheckCircle, Loader2, ArrowUpDown, FileLock2, ChevronLeft, ChevronRight, Printer, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { useFirestore } from "@/firebase";
import { doc, writeBatch } from "firebase/firestore";
import { QUALIFICHE, isMinorCheck as isMinor } from "./edit-socio-form";

// Helper Functions
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
    // Only members in the 'members' collection can expire.
    // Requests in 'membership_requests' are pending, not active, so they can't expire.
    if (!socio.expirationDate) {
        return false;
    }
    const expirationDate = parseDate(socio.expirationDate);
    if (!expirationDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Compare dates only
    
    return expirationDate < today;
};

export const getStatus = (socio: Socio): 'active' | 'pending' | 'rejected' | 'expired' => {
    // If it's in the members collection, it's either active or expired
    if (socio.tessera) {
        return isExpired(socio) ? 'expired' : 'active';
    }
    // If it's in the requests collection, it's pending or rejected
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

const statusTranslations: Record<string, string> = {
  active: 'Attivo',
  pending: 'Sospeso',
  rejected: 'Rifiutato',
  expired: 'Scaduto'
};

const QUALIFICA_COLORS: Record<string, string> = {
  "FONDATORE": "text-yellow-400",
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
  onPrint,
  allMembers,
  onSocioUpdate,
}: { 
  socio: Socio; 
  onEdit: (socio: Socio) => void;
  onPrint: (socio: Socio) => void;
  allMembers: Socio[];
  onSocioUpdate: (tab?: 'active' | 'expired' | 'requests') => void;
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [membershipFee, setMembershipFee] = useState(10);
  const [qualifiche, setQualifiche] = useState<string[]>([]);
  const [feePaid, setFeePaid] = useState(false);
  const [approvedSocioData, setApprovedSocioData] = useState<Socio | null>(null);

  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewalYear, setRenewalYear] = useState("");
  const [renewalFee, setRenewalFee] = useState(10);
  const [renewedSocioData, setRenewedSocioData] = useState<Socio | null>(null);

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

  useEffect(() => {
    if (showApproveDialog) {
      const currentYear = new Date().getFullYear();
      
      const yearMemberNumbers = allMembers
        .filter(m => m.membershipYear === String(currentYear) && m.tessera)
        .map(m => parseInt(m.tessera!.split('-')[2], 10))
        .filter(n => !isNaN(n));
      
      const maxNumber = yearMemberNumbers.length > 0 ? Math.max(...yearMemberNumbers) : 0;
      const nextNumber = maxNumber + 1;
      
      setNewMemberNumber(String(nextNumber));
      setMembershipFee(socioIsMinor ? 0 : 10);
      setQualifiche(socio.qualifica || []);
      setFeePaid(false);
    }
  }, [showApproveDialog, allMembers, socioIsMinor, socio.qualifica]);

   useEffect(() => {
    if (showRenewDialog) {
      const currentYear = new Date().getFullYear();
      setRenewalYear(String(currentYear));
      setRenewalFee(socioIsMinor ? 0 : 10);
    }
  }, [showRenewDialog, socioIsMinor]);


  const handleApprove = async () => {
    if (!firestore || isApproving || !feePaid) return;

    setIsApproving(true);
    const currentYear = new Date().getFullYear();
    const membershipCardNumber = `GMC-${currentYear}-${newMemberNumber}`;

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
        membershipFee: membershipFee,
        qualifica: qualifiche,
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
        setApprovedSocioData(newMemberData);
        // The dialog state will now show the success screen
    } catch (error) {
        console.error("Error approving member:", error);
        toast({
            title: "Errore di Approvazione",
            description: `Impossibile approvare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: "destructive",
        });
        setIsApproving(false);
    } 
  };
  
const handleRenew = async () => {
    if (!firestore || isRenewing) return;
    setIsRenewing(true);

    try {
        const memberDocRef = doc(firestore, 'members', socio.id);
        const renewalDateISO = new Date().toISOString();
        const oldNotes = socio.notes || '';
        const renewalNote = `--- RINNOVO ${formatDate(renewalDateISO)} ---\nAnno: ${renewalYear}, Quota: €${renewalFee.toFixed(2)}`;
        
        const newNotes = `${renewalNote}\n\n${oldNotes}`.trim();

        const updatedData = {
            renewalDate: renewalDateISO,
            expirationDate: new Date(parseInt(renewalYear, 10), 11, 31).toISOString(),
            membershipYear: renewalYear,
            membershipFee: renewalFee,
            notes: newNotes,
        };

        const batch = writeBatch(firestore);
        batch.update(memberDocRef, updatedData);
        await batch.commit();

        const newlyRenewedSocio = { ...socio, ...updatedData };
        
        toast({
            title: 'Rinnovo Effettuato!',
            description: `Il tesseramento di ${getFullName(socio)} è stato rinnovato per l'anno ${renewalYear}.`,
        });
        
        setRenewedSocioData(newlyRenewedSocio);
      
    } catch (error) {
        console.error('Error renewing member:', error);
        toast({
            title: 'Errore di Rinnovo',
            description: `Impossibile rinnovare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: 'destructive',
        });
        setIsRenewing(false);
    }
};

  
  const handleQualificaChange = (qualifica: string, checked: boolean) => {
    setQualifiche(prev => 
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };
  
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const groupInviteLink = "https://chat.whatsapp.com/KKes4gzve7T8xET9OD3bm5";
    window.open(groupInviteLink, '_blank', 'noopener,noreferrer');
  };

  const tesseraDisplay = socio.tessera ? `${socio.tessera.split('-')[1]}-${socio.tessera.split('-')[2]}` : '-';

  return (
      <TableRow className={cn("text-xs sm:text-sm", { 'bg-yellow-500/10 hover:bg-yellow-500/20': status === 'expired' })}>
        <TableCell className="font-mono hidden sm:table-cell">
          {tesseraDisplay}
        </TableCell>
        <TableCell className="font-medium">
           <div className="flex items-center gap-3 flex-wrap">
                <Dialog>
                   <DialogTrigger asChild>
                     <div className="flex items-center gap-2 cursor-pointer group">
                        <span className="group-hover:text-primary transition-colors">{getFullName(socio)}</span>
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
                        <DetailRow icon={<FileLock2 />} label="Consenso Privacy" value={
                           <span className={`flex items-center gap-2 ${socio.privacyConsent ? 'text-green-500' : 'text-red-500'}`}>
                             {socio.privacyConsent ? 'Accettato' : 'Non Accettato'}
                           </span>
                        } />
                       <DetailRow icon={<Calendar />} label="Anno Associativo" value={socio.membershipYear || new Date().getFullYear()} />
                       <DetailRow icon={<Calendar />} label="Data Richiesta" value={formatDate(socio.requestDate)} />
                       {status !== 'pending' && <DetailRow icon={<Calendar />} label="Data Ammissione" value={formatDate(socio.joinDate)} />}
                       {socio.renewalDate && <DetailRow icon={<Calendar />} label="Data Rinnovo" value={formatDate(socio.renewalDate)} />}
                       <DetailRow icon={<Euro />} label="Quota Versata" value={formatCurrency(status === 'pending' ? 0 : socio.membershipFee)} />
                       {socio.isVolunteer && <DetailRow icon={<HandHeart />} label="Volontario" value="Sì" />}
                       <DetailRow icon={<StickyNote />} label="Note" value={<pre className="text-wrap font-sans">{socio.notes}</pre>} />
                     </div>
                      <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
                          <DialogClose asChild>
                            <Button variant="ghost">Chiudi</Button>
                          </DialogClose>
                          <div className="flex gap-2">
                             <Button variant="outline" onClick={() => onEdit(socio)}><Pencil className="mr-2 h-4 w-4" /> Modifica Dati</Button>
                          </div>
                      </DialogFooter>
                   </DialogContent>
                 </Dialog>
                 <div className="flex items-center gap-1">
                    {socio.whatsappConsent && (
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <button onClick={handleWhatsAppClick} className="text-green-500 hover:text-green-400">
                               <MessageCircle className="h-4 w-4" />
                               <span className="sr-only">Contatta su WhatsApp</span>
                             </button>
                           </TooltipTrigger>
                           <TooltipContent>
                             <p>Consenso WhatsApp attivo. Clicca per unirti al gruppo.</p>
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
                         <DetailRow icon={<User />} label="Nome Tutore" value={`${socio.guardianFirstName} ${socio.guardianLastName}`} />
                         <DetailRow icon={<Calendar />} label="Data di Nascita Tutore" value={formatDate(socio.guardianBirthDate)} />
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
        <TableCell>
          <Badge
            variant={status === "active" ? "default" : status === "pending" ? "secondary" : "destructive"}
            className={cn("whitespace-nowrap",{
              "bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30": status === "active",
              "bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30": status === "expired",
              "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30": status === "pending",
              "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30": status === "rejected",
            })}
          >
            {statusTranslations[status] || status}
          </Badge>
        </TableCell>
        <TableCell className="text-right space-x-1">
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

            {status === 'pending' && (
              <Dialog open={showApproveDialog} onOpenChange={handleApproveDialogChange}>
                <DialogTrigger asChild>
                   <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-500 hover:bg-green-500/10 h-8">
                      <CheckCircle className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Approva</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  {approvedSocioData ? (
                    <>
                       <DialogHeader>
                          <DialogTitle>Approvazione Completata!</DialogTitle>
                          <DialogDescription>
                              <strong className="text-foreground">{getFullName(approvedSocioData)}</strong> è ora un membro attivo.
                          </DialogDescription>
                       </DialogHeader>
                       <div className="py-4 text-center">
                          <p className="text-sm">Nuovo numero tessera:</p>
                          <p className="font-bold text-lg text-primary">{approvedSocioData.tessera}</p>
                       </div>
                       <DialogFooter>
                          <Button variant="ghost" onClick={() => handleApproveDialogChange(false)}>Chiudi</Button>
                          <Button onClick={() => { onPrint(approvedSocioData); handleApproveDialogChange(false); }}>
                             <Printer className="mr-2 h-4 w-4" /> Stampa Scheda
                          </Button>
                       </DialogFooter>
                    </>
                  ) : (
                    <>
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
                                    value={`GMC-${new Date().getFullYear()}-${newMemberNumber}`}
                                    onChange={(e) => {
                                        const parts = e.target.value.split('-');
                                        setNewMemberNumber(parts[parts.length - 1] || '');
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
                           <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                              <Label htmlFor="membership-fee" className="sm:text-right">
                                  Quota (€)
                              </Label>
                              <div className="col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <Input
                                    id="membership-fee"
                                    type="number"
                                    value={membershipFee}
                                    onChange={(e) => setMembershipFee(Number(e.target.value))}
                                    className="w-28"
                                />
                                 <div className="flex items-center space-x-2">
                                    <Checkbox id="fee-paid" checked={feePaid} onCheckedChange={(checked) => setFeePaid(!!checked)} />
                                    <Label htmlFor="fee-paid" className="text-sm font-medium">Quota Versata</Label>
                                </div>
                              </div>
                          </div>
                      </div>
                      <DialogFooter>
                          <Button variant="ghost" onClick={() => handleApproveDialogChange(false)}>Annulla</Button>
                          <Button onClick={handleApprove} disabled={isApproving || !feePaid}>
                              {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Conferma e Approva
                          </Button>
                      </DialogFooter>
                    </>
                  )}
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
                <DialogContent className="sm:max-w-md">
                    {renewedSocioData ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>Rinnovo Completato!</DialogTitle>
                                <DialogDescription>
                                    L'iscrizione di <strong className="text-foreground">{getFullName(renewedSocioData)}</strong> è stata rinnovata per l'anno {renewedSocioData.membershipYear}.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 text-center">
                                <p className="text-sm">Nuova data di scadenza:</p>
                                <p className="font-bold text-lg text-primary">{formatDate(renewedSocioData.expirationDate)}</p>
                                 <p className="text-sm mt-2">Data rinnovo:</p>
                                <p className="font-bold text-lg text-primary">{formatDate(renewedSocioData.renewalDate)}</p>
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
                                    Stai rinnovando il tesseramento per <strong className="text-foreground">{getFullName(socio)}</strong>.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="renewal-year" className="text-right">
                                        Anno
                                    </Label>
                                    <Input
                                        id="renewal-year"
                                        value={renewalYear}
                                        onChange={(e) => setRenewalYear(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="renewal-fee" className="text-right">
                                        Quota (€)
                                    </Label>
                                    <Input
                                        id="renewal-fee"
                                        type="number"
                                        value={renewalFee}
                                        onChange={(e) => setRenewalFee(Number(e.target.value))}
                                        className="col-span-3"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => handleRenewDialogChange(false)}>Annulla</Button>
                                <Button onClick={handleRenew} disabled={isRenewing}>
                                    {isRenewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Conferma Rinnovo
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
               </Dialog>
            )}
        </TableCell>
      </TableRow>
  );
};


export type SortConfig = {
  key: keyof Socio | 'name' | 'tessera';
  direction: 'ascending' | 'descending';
};

interface SociTableProps {
  soci: Socio[];
  onEdit: (socio: Socio) => void;
  onPrint: (socio: Socio) => void;
  allMembers: Socio[];
  sortConfig: SortConfig;
  setSortConfig: Dispatch<SetStateAction<SortConfig>>;
  itemsPerPage: number;
  onSocioUpdate: (tab?: 'active' | 'expired' | 'requests') => void;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
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
  itemsPerPage,
  currentPage,
  setCurrentPage
}: SociTableProps) => {

  const totalPages = Math.ceil(soci.length / itemsPerPage);
  const paginatedSoci = soci.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );


  const handleNextPage = () => {
      if (currentPage < totalPages) {
          setCurrentPage(currentPage + 1);
          window.scrollTo(0, 0);
      }
  };

  const handlePreviousPage = () => {
      if (currentPage > 1) {
          setCurrentPage(currentPage - 1);
          window.scrollTo(0, 0);
      }
  };

  return (
    <div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Tessera" sortKey="tessera" sortConfig={sortConfig} setSortConfig={setSortConfig} className="w-[100px] hidden sm:table-cell" />
              <SortableHeader label="Nome" sortKey="name" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <SortableHeader label="Nascita" sortKey="birthDate" sortConfig={sortConfig} setSortConfig={setSortConfig} className="hidden md:table-cell" />
              <SortableHeader label="Stato" sortKey="status" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSoci.length > 0 ? (
              paginatedSoci.map((socio) => (
                <SocioTableRow 
                  key={socio.id} 
                  socio={socio}
                  onEdit={onEdit}
                  onPrint={onPrint}
                  allMembers={allMembers}
                  onSocioUpdate={onSocioUpdate}
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
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
            Pagina {currentPage} di {totalPages > 0 ? totalPages : 1}
        </div>
        <div className="space-x-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Precedente</span>
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
            >
                <span className="hidden sm:inline">Successivo</span>
                <ChevronRight className="h-4 w-4 sm:ml-2" />
            </Button>
        </div>
      </div>
    </div>
  );
}
