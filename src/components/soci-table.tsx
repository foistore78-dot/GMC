"use client";

import { useState, useMemo, useEffect, Dispatch, SetStateAction } from "react";
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
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Pencil, MessageCircle, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, HandHeart, Award, CircleDot, CheckCircle, Loader2, ArrowUpDown, FileLock2, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { useFirestore } from "@/firebase";
import { doc, writeBatch, updateDoc } from "firebase/firestore";
import { format, parseISO, isValid, isBefore, startOfToday } from 'date-fns';
import { QUALIFICHE, isMinorCheck as isMinor } from "./edit-socio-form";
import { SocioCard } from "./socio-card";


// Helper Functions
export const getFullName = (socio: any) => `${socio.lastName || ''} ${socio.firstName || ''}`.trim();

const isExpired = (socio: Socio): boolean => {
    if (socio.membershipStatus !== 'active' || !socio.expirationDate) {
        return false;
    }
    const expirationDate = new Date(socio.expirationDate);
    return isBefore(expirationDate, startOfToday());
};

export const getStatus = (socio: any): 'active' | 'pending' | 'rejected' | 'expired' => {
    if (socio.membershipStatus === 'active') {
        if (isExpired(socio)) {
            return 'expired';
        }
        return 'active';
    }
    if (socio.status === 'rejected') return 'rejected';
    return socio.status || 'pending';
};


export const formatDate = (dateString: any, outputFormat: string = 'dd/MM/yyyy') => {
    if (!dateString) return 'N/A';
    let date: Date;

    if (dateString && typeof dateString.toDate === 'function') {
        date = dateString.toDate();
    } else if (typeof dateString === 'string') {
        date = parseISO(dateString);
    } else if (dateString instanceof Date) {
        date = dateString;
    } else {
        return 'N/A';
    }

    if (!isValid(date)) {
        return 'N/A';
    }

    try {
        return format(date, outputFormat);
    } catch {
        return 'N/A';
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
  allMembers,
  onSocioApproved,
  onSocioRenewed,
}: { 
  socio: Socio; 
  onEdit: (socio: Socio) => void;
  allMembers: Socio[];
  onSocioApproved?: (socio: Socio) => void;
  onSocioRenewed?: (socio: Socio) => void;
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  
  const [newMemberNumber, setNewMemberNumber] = useState("");
  const [membershipFee, setMembershipFee] = useState(10);
  const [qualifiche, setQualifiche] = useState<string[]>([]);
  const [feePaid, setFeePaid] = useState(false);
  
  const [newRenewalMemberNumber, setNewRenewalMemberNumber] = useState("");
  const [renewalFee, setRenewalFee] = useState(10);
  const [renewalQualifiche, setRenewalQualifiche] = useState<string[]>([]);
  const [renewalFeePaid, setRenewalFeePaid] = useState(false);


  const status = getStatus(socio);
  const socioIsMinor = isMinor(socio.birthDate);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const cardContainer = document.createElement('div');
      
      // Temporarily render the SocioCard to get its HTML
      const ReactDOMServer = require('react-dom/server');
      const cardHtml = ReactDOMServer.renderToString(
        <>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Roboto:wght@400;500;700&display=swap');
            body { font-family: 'Roboto', sans-serif; margin: 0; }
            .font-headline { font-family: 'Orbitron', sans-serif; }
          `}</style>
          <SocioCard socio={socio} />
        </>
      );
      
      const pageStyles = `
        @page { size: A4; margin: 0; }
        body { margin: 0; background: white; color: black; }
        #printable-card { 
          width: 210mm; 
          height: 297mm; 
          padding: 15mm; 
          box-sizing: border-box; 
        }
      `;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Scheda Socio - ${getFullName(socio)}</title>
            <style>${pageStyles}</style>
          </head>
          <body>
            ${cardHtml}
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  useEffect(() => {
    if (showApproveDialog) {
      const currentYear = new Date().getFullYear();
      
      const yearMemberNumbers = allMembers
        .filter(m => m.membershipYear === String(currentYear) && m.tessera)
        .map(m => parseInt(m.tessera!.split('-')[2], 10))
        .filter(n => !isNaN(n));
      
      let nextNumber = 1;
      const sortedNumbers = yearMemberNumbers.sort((a, b) => a - b);
      for (const num of sortedNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else {
          break; 
        }
      }
      
      setNewMemberNumber(String(nextNumber));
      setMembershipFee(socioIsMinor ? 0 : 10);
      setQualifiche(socio.qualifica || []);
      setFeePaid(false); // Reset checkbox
    }
  }, [showApproveDialog, allMembers, socioIsMinor, socio.qualifica]);

  useEffect(() => {
    if(showRenewDialog) {
       const currentYear = new Date().getFullYear();
       const yearMemberNumbers = allMembers
        .filter(m => m.membershipYear === String(currentYear) && m.tessera)
        .map(m => parseInt(m.tessera!.split('-')[2], 10))
        .filter(n => !isNaN(n));
      
      let nextNumber = 1;
      const sortedNumbers = yearMemberNumbers.sort((a, b) => a - b);
      for (const num of sortedNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else {
          break; 
        }
      }
       setNewRenewalMemberNumber(String(nextNumber));
       setRenewalFee(isMinor(socio.birthDate) ? 0 : 10);
       setRenewalQualifiche(socio.qualifica || []);
       setRenewalFeePaid(false); // Reset checkbox
    }
  }, [showRenewDialog, socio.birthDate, socio.qualifica, allMembers]);

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
        id: socio.id, // Ensure id is carried over
        joinDate: new Date().toISOString(),
        membershipStatus: 'active' as const,
        expirationDate: new Date(currentYear, 11, 31).toISOString(),
        membershipYear: String(currentYear),
        tessera: membershipCardNumber,
        membershipFee: membershipFee,
        qualifica: qualifiche,
        requestDate: socio.requestDate || new Date().toISOString(),
    };

    batch.set(memberDocRef, newMemberData, { merge: true });
    batch.delete(requestDocRef);

    try {
        await batch.commit();
        toast({
            title: "Socio Approvato!",
            description: `${getFullName(socio)} è ora un membro attivo. N. tessera: ${membershipCardNumber}`,
        });
        setShowApproveDialog(false);
        if (onSocioApproved) onSocioApproved(newMemberData);
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

  const handleRenew = async () => {
    if (!firestore || isRenewing || !renewalFeePaid) return;
    setIsRenewing(true);

    const currentYear = new Date().getFullYear();
    const newTessera = `GMC-${currentYear}-${newRenewalMemberNumber}`;

    const today = new Date();
    const renewalNote = `Associato dall'anno ${socio.membershipYear} con tessera ${socio.tessera}, quota ${formatCurrency(socio.membershipFee)}. Rinnovato in data ${formatDate(today)}.`;
    const updatedNotes = socio.notes ? `${socio.notes}\n${renewalNote}` : renewalNote;
    
    const memberDocRef = doc(firestore, "members", socio.id);
    
    const renewedSocioData = {
        membershipYear: String(currentYear),
        tessera: newTessera,
        membershipFee: renewalFee,
        qualifica: renewalQualifiche,
        expirationDate: new Date(currentYear, 11, 31).toISOString(),
        renewalDate: today.toISOString(),
        notes: updatedNotes,
    };

    try {
        await updateDoc(memberDocRef, renewedSocioData);

        toast({
            title: "Rinnovo Effettuato!",
            description: `${getFullName(socio)} è stato rinnovato per l'anno ${currentYear}. Nuova tessera: ${newTessera}`,
        });
        setShowRenewDialog(false);
        if (onSocioRenewed) onSocioRenewed({ ...socio, ...renewedSocioData });

    } catch (error) {
        console.error("Error renewing member:", error);
        toast({
            title: "Errore di Rinnovo",
            description: `Impossibile rinnovare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
            variant: "destructive",
        });
    } finally {
        setIsRenewing(false);
    }
  };
  
  const handleQualificaChange = (qualifica: string, checked: boolean) => {
    setQualifiche(prev => 
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };
   
  const handleRenewalQualificaChange = (qualifica: string, checked: boolean) => {
    setRenewalQualifiche(prev => 
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };

  const tesseraDisplay = socio.tessera ? `${socio.tessera.split('-')[1]}-${socio.tessera.split('-')[2]}` : '-';

  return (
      <TableRow className={cn({ 'bg-orange-500/10 hover:bg-orange-500/20': status === 'expired' })}>
        <TableCell className="font-mono text-xs">
          {tesseraDisplay}
        </TableCell>
        <TableCell className="font-medium">
           <div className="flex items-center gap-3 flex-wrap">
                <Dialog>
                   <DialogTrigger asChild>
                     <div className="flex items-center gap-2 cursor-pointer group">
                        <span className="group-hover:text-primary transition-colors">{getFullName(socio)}</span>
                        {socio.whatsappConsent && <MessageCircle className="w-4 h-4 text-green-500 ml-1" />}
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
                       {socio.membershipStatus === 'active' && <DetailRow icon={<Calendar />} label="Data Ammissione" value={formatDate(socio.joinDate)} />}
                       {socio.renewalDate && <DetailRow icon={<Calendar />} label="Data Rinnovo" value={formatDate(socio.renewalDate)} />}
                       <DetailRow icon={<Euro />} label="Quota Versata" value={formatCurrency(status === 'pending' ? 0 : socio.membershipFee)} />
                       {socio.isVolunteer && <DetailRow icon={<HandHeart />} label="Volontario" value="Sì" />}
                       <DetailRow icon={<StickyNote />} label="Note" value={<pre className="text-wrap font-sans">{socio.notes}</pre>} />
                     </div>
                      <DialogFooter className="sm:justify-between">
                          <DialogClose asChild>
                            <Button variant="ghost">Chiudi</Button>
                          </DialogClose>
                          <div className="flex gap-2">
                             <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Stampa Scheda</Button>
                             <Button onClick={() => onEdit(socio)}><Pencil className="mr-2 h-4 w-4" /> Modifica Dati</Button>
                          </div>
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
              "bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30": status === "expired",
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrint}>
                            <Printer className="h-4 w-4" />
                            <span className="sr-only">Stampa Scheda</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Stampa Scheda</TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {status === 'pending' && (
              <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-500 hover:bg-green-500/10">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approva
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="membership-number" className="text-right">
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
                            <div className="col-span-3 flex items-center gap-4">
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
                        <Button variant="ghost" onClick={() => setShowApproveDialog(false)}>Annulla</Button>
                        <Button onClick={handleApprove} disabled={isApproving || !feePaid}>
                            {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Conferma e Approva
                        </Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {status === 'expired' && (
              <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-orange-500 hover:text-orange-500 hover:bg-orange-500/10">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Rinnova
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Rinnova Iscrizione Socio</DialogTitle>
                        <DialogDescription>
                            Stai per rinnovare l'iscrizione di <strong className="text-foreground">{getFullName(socio)}</strong> per l'anno in corso.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="renewal-membership-number" className="text-right">
                                N. Tessera
                            </Label>
                            <div className="col-span-3">
                              <Input
                                  id="renewal-membership-number"
                                  value={`GMC-${new Date().getFullYear()}-${newRenewalMemberNumber}`}
                                  onChange={(e) => {
                                      const parts = e.target.value.split('-');
                                      setNewRenewalMemberNumber(parts[parts.length - 1] || '');
                                  }}
                                  className="w-40"
                              />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">Qualifiche</Label>
                            <div className="col-span-3 space-y-2">
                                {QUALIFICHE.map((q) => (
                                   <div key={q} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`renewal-qualifica-${q}`} 
                                            checked={renewalQualifiche.includes(q)}
                                            onCheckedChange={(checked) => handleRenewalQualificaChange(q, !!checked)}
                                        />
                                        <label htmlFor={`renewal-qualifica-${q}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {q}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="renewal-fee" className="text-right">
                                Quota Rinnovo (€)
                            </Label>
                            <div className="col-span-3 flex items-center gap-4">
                                <Input
                                    id="renewal-fee"
                                    type="number"
                                    value={renewalFee}
                                    onChange={(e) => setRenewalFee(Number(e.target.value))}
                                    className="w-28"
                                />
                                 <div className="flex items-center space-x-2">
                                    <Checkbox id="renewal-fee-paid" checked={renewalFeePaid} onCheckedChange={(checked) => setRenewalFeePaid(!!checked)} />
                                    <Label htmlFor="renewal-fee-paid" className="text-sm font-medium">Quota Versata</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowRenewDialog(false)}>Annulla</Button>
                        <Button onClick={handleRenew} disabled={isRenewing || !renewalFeePaid}>
                            {isRenewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Conferma Rinnovo
                        </Button>
                    </DialogFooter>
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
  allMembers: Socio[];
  sortConfig: SortConfig;
  setSortConfig: Dispatch<SetStateAction<SortConfig>>;
  itemsPerPage: number;
  onSocioApproved: (socio: Socio) => void;
  onSocioRenewed: (socio: Socio) => void;
  filter: string;
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
      <Button variant="ghost" onClick={handleSort} className="px-2 py-1 h-auto">
        {label}
        <ArrowUpDown className={cn("ml-2 h-4 w-4", direction === 'none' && "text-muted-foreground/50")} />
      </Button>
    </TableHead>
  );
};

const SociTableComponent = ({ 
  soci, 
  onEdit, 
  allMembers, 
  onSocioApproved, 
  onSocioRenewed, 
  sortConfig, 
  setSortConfig, 
  itemsPerPage,
  filter,
  currentPage,
  setCurrentPage
}: SociTableProps) => {

  const filteredSoci = useMemo(() => {
    const searchString = filter.toLowerCase();
    
    if (!searchString) {
      return soci;
    }
    
    return soci.filter(socio => {
      if (!socio) return false;
      const firstName = socio.firstName?.toLowerCase() || '';
      const lastName = socio.lastName?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`;
      const reversedFullName = `${lastName} ${firstName}`;
      const email = socio.email?.toLowerCase() || '';
      const tessera = socio.tessera?.toLowerCase() || '';
      const birthDate = formatDate(socio.birthDate);

      return (
        firstName.includes(searchString) ||
        lastName.includes(searchString) ||
        fullName.includes(searchString) ||
        reversedFullName.includes(searchString) ||
        email.includes(searchString) ||
        tessera.includes(searchString) ||
        (birthDate !== 'N/A' && birthDate.includes(searchString))
      );
    });
  }, [soci, filter]);
  
  const totalPages = Math.ceil(filteredSoci.length / itemsPerPage);
  const paginatedSoci = filteredSoci.slice(
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Tessera" sortKey="tessera" sortConfig={sortConfig} setSortConfig={setSortConfig} className="w-[120px]" />
              <SortableHeader label="Nome" sortKey="name" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <SortableHeader label="Nascita" sortKey="birthDate" sortConfig={sortConfig} setSortConfig={setSortConfig} className="hidden md:table-cell" />
              <SortableHeader label="Stato" sortKey="membershipStatus" sortConfig={sortConfig} setSortConfig={setSortConfig} />
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
                  allMembers={allMembers}
                  onSocioApproved={onSocioApproved}
                  onSocioRenewed={onSocioRenewed}
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

      <div className="hidden">
        {soci.map(socio => (
            <div key={`card-${socio.id}`} id={`card-${socio.id}`} className="print:block">
                <SocioCard socio={socio} />
            </div>
        ))}
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
                <ChevronLeft className="mr-2 h-4 w-4" />
                Precedente
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
            >
                Successivo
                <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
}


export const SociTable = SociTableComponent;
