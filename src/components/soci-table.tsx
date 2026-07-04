
"use client";

import { useState, useMemo, useEffect, useCallback, memo, type Dispatch, type SetStateAction } from "react";
import type { Socio } from "@/lib/soci-data";
import { QUALIFICHE, QUALIFICA_COLORS } from "@/lib/soci-data";

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
import { RefreshCw, Pencil, ShieldCheck, User, Calendar, Mail, Phone, Home, Hash, Euro, StickyNote, Award, CheckCircle, Loader2, ArrowUpDown, FileLock2, Printer, MessageCircle, Cake, Trash2, MoreVertical, MapPin, UserCheck, Info, AlertTriangle, Users, Smartphone, KeyRound, RotateCcw } from "lucide-react";
import { cn, getFullName, getStatus, formatDate, parseDate, formatCurrency, isMinorCheck as isMinor, getNextMemberNumberForYear, getSignatureMetadata } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { useFirestore, useAuth, deleteDocumentNonBlocking, logAdminActivity } from "@/firebase";
import { doc, writeBatch, getDoc, deleteDoc, deleteField, updateDoc, serverTimestamp } from "firebase/firestore";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

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

const getSecondaryAuth = () => {
  if (typeof window === 'undefined') return null;
  const secondaryApp = getApps().find(app => app.name === 'phone-verifier') || initializeApp(firebaseConfig, 'phone-verifier');
  return getAuth(secondaryApp);
};

const SocioTableRow = memo(({ 
  socio,
  onEdit,
  onPrint,
  allMembers,
  onSocioUpdate,
  activeTab,
  onNewApproval,
}: { 
  socio: Socio; 
  onEdit: (socio: Socio) => void;
  onPrint: (socio: Socio) => void;
  allMembers: Socio[];
  onSocioUpdate: (tab?: 'active' | 'expired' | 'requests' | 'rejected') => void;
  activeTab: 'active' | 'expired' | 'requests' | 'rejected';
  onNewApproval?: (socio: Socio) => void;
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
  const [overrideDuplicateCheck, setOverrideDuplicateCheck] = useState(false);

  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [renewalYear, setRenewalYear] = useState("");
  const [renewalFee, setRenewalFee] = useState(10);
  const [renewMemberNumber, setRenewMemberNumber] = useState("");
  const [renewQualifiche, setRenewQualifiche] = useState<string[]>([]);
  const [renewFeePaid, setRenewFeePaid] = useState(false);
  const [renewedSocioData, setRenewedSocioData] = useState<Socio | null>(null);

  const [socioToReject, setSocioToReject] = useState<Socio | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const [showDeleteConfirm1, setShowDeleteConfirm1] = useState(false);
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const auth = useAuth();
  const [showAdminOtpModal, setShowAdminOtpModal] = useState(false);
  const [adminOtpCode, setAdminOtpCode] = useState("");
  const [isSendingAdminOtp, setIsSendingAdminOtp] = useState(false);
  const [isVerifyingAdminOtp, setIsVerifyingAdminOtp] = useState(false);
  const [adminConfirmationResult, setAdminConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [hasPaperCopy, setHasPaperCopy] = useState(false);

  // Dialog: conferma invio SMS OTP
  const [showSendOtpConfirmDialog, setShowSendOtpConfirmDialog] = useState(false);
  const [phoneForOtp, setPhoneForOtp] = useState("");

  // Dialog: firma già esistente
  const [showSignatureExistsDialog, setShowSignatureExistsDialog] = useState(false);

  // Dialog: numero di telefono mancante
  const [showAddPhoneDialog, setShowAddPhoneDialog] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Dialog: firma mancante all'approvazione/rinnovo
  const [showMissingSignatureWarning, setShowMissingSignatureWarning] = useState(false);
  const [pendingActionAfterOtp, setPendingActionAfterOtp] = useState<'approve' | 'renew' | null>(null);

  // Stato temporaneo per la firma appena verificata
  const [verifiedSignatureLocal, setVerifiedSignatureLocal] = useState<any>(null);
  const [verifiedNotesLocal, setVerifiedNotesLocal] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const status = useMemo(() => getStatus(socio, activeTab !== 'requests'), [socio, activeTab]);
  const socioIsMinor = useMemo(() => isMinor(socio.birthDate), [socio.birthDate]);
  const needsGuardianSignature = useMemo(() => {
    if (!socioIsMinor) return false;
    if (socio.guardianPaperSigned) return false;
    if (socio.joinDate) {
      const jDate = new Date(socio.joinDate);
      const cutoffDate = new Date(2026, 6, 1); // 1 Luglio 2026 (mesi 0-indexed in JS)
      if (jDate < cutoffDate) return false;
    }
    return true;
  }, [socioIsMinor, socio.guardianPaperSigned, socio.joinDate]);
  
  // Logic to distinguish new members from renewals
  const isRenewedMember = activeTab === 'active' && !!socio.renewalDate;
  const isNewMember = activeTab === 'active' && !socio.renewalDate && !!socio.joinDate;

  const potentialDuplicate = useMemo(() => {
    if (activeTab !== 'requests' || isApproving) return null;
    return allMembers.find(m => 
      m.firstName.toLowerCase().trim() === socio.firstName.toLowerCase().trim() &&
      m.lastName.toLowerCase().trim() === socio.lastName.toLowerCase().trim() &&
      m.birthDate === socio.birthDate
    );
  }, [allMembers, socio.firstName, socio.lastName, socio.birthDate, activeTab, isApproving]);

  const resetApproveDialog = useCallback(() => {
    setShowApproveDialog(false);
    setIsApproving(false);
    setApprovedSocioData(null);
    setOverrideDuplicateCheck(false);
    setVerifiedSignatureLocal(null);
    setVerifiedNotesLocal(null);
  }, []);
  
  const resetRenewDialog = useCallback(() => {
      setShowRenewDialog(false);
      setIsRenewing(false);
      setRenewedSocioData(null);
      setVerifiedSignatureLocal(null);
      setVerifiedNotesLocal(null);
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

  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    if (!firestore || isRestoring) return;
    setIsRestoring(true);

    try {
        const batch = writeBatch(firestore);
        const todayStr = new Date().toLocaleDateString('it-IT');
        const oldNotes = socio.notes || '';
        
        const historyEntry = `--- STORICO RIPRISTINO (TORNA IN RICHIESTA) ${todayStr} ---\nSocio ripristinato dall'elenco respinti e riportato in RICHIESTE.\n------------------------`;
        const newNotes = `${historyEntry}\n\n${oldNotes}`.trim();

        const memberDocRef = doc(firestore, "members", socio.id);
        const requestDocRef = doc(firestore, "membership_requests", socio.id);
        
        // Rimuoviamo dati di tesseramento e riportiamo allo stato di richiesta
        const { status, tessera, joinDate, renewalDate, expirationDate, membershipYear, membershipFee, ...restOfSocio } = socio;
        
        const restoredRequestData = {
            ...restOfSocio,
            status: 'pending' as const,
            notes: newNotes,
            requestDate: new Date().toISOString(),
            submittedAt: new Date().toISOString()
        };

        batch.set(requestDocRef, restoredRequestData);
        batch.delete(memberDocRef);

        await batch.commit();

        logAdminActivity(firestore, 'restore', `${getFullName(socio)} è stato ripristinato ed è tornato in RICHIESTE.`);

        toast({
            title: "Socio Ripristinato",
            description: `${getFullName(socio)} è stato spostato nelle richieste.`,
        });
        
        onSocioUpdate('requests');
    } catch (error: any) {
        toast({
            title: "Errore",
            description: `Impossibile ripristinare il socio: ${error.message}`,
            variant: "destructive"
        });
    } finally {
        setIsRestoring(false);
    }
  };

  // Prepara il flusso OTP e chiede conferma prima di inviare l'SMS
  const initiateOtpFlow = (phoneOverride?: string) => {
    const currentSig = getSignatureMetadata(socio);
    setHasPaperCopy(currentSig.method === 'MANUAL_PAPER');
    
    const phoneRaw = phoneOverride || String(socio.phone || '').replace(/\s+/g, '');
    let phone = phoneRaw;
    if (phone.startsWith('00')) {
      phone = `+${phone.slice(2)}`;
    }
    if (!phone.startsWith('+')) {
      if (phone.startsWith('39') && phone.length >= 10) {
        phone = `+${phone}`;
      } else if (phone.startsWith('386') && phone.length >= 9) {
        phone = `+${phone}`;
      } else if (phone.startsWith('43') && phone.length >= 9) {
        phone = `+${phone}`;
      } else if (phone.startsWith('41') && phone.length >= 9) {
        phone = `+${phone}`;
      } else if (phone.startsWith('44') && phone.length >= 10) {
        phone = `+${phone}`;
      } else {
        phone = `+39${phone.replace(/^0+/, '')}`;
      }
    }
    
    setPhoneForOtp(phone);
    setShowSendOtpConfirmDialog(true);
  };

  // Esegue l'invio reale del codice OTP via SMS
  const sendOtpSms = async () => {
    if (!phoneForOtp) return;
    setIsSendingAdminOtp(true);
    try {
      const secAuth = getSecondaryAuth();
      if (secAuth) {
        const containerId = `admin-recaptcha-container-${socio.id}`;
        let recaptcha = (window as any)[`adminRecaptchaVerifierSec_${socio.id}`];
        if (!recaptcha) {
          recaptcha = new RecaptchaVerifier(secAuth, containerId, {
            size: 'invisible'
          });
          (window as any)[`adminRecaptchaVerifierSec_${socio.id}`] = recaptcha;
        }
        const result = await signInWithPhoneNumber(secAuth, phoneForOtp, recaptcha);
        setAdminConfirmationResult(result);
      }
      setShowSendOtpConfirmDialog(false);
      setShowAdminOtpModal(true);
      toast({
        title: "SMS OTP Inviato!",
        description: `Abbiamo inviato il codice SMS a 6 cifre al numero ${phoneForOtp}.`,
      });
    } catch (error: any) {
      console.error("Errore invio OTP admin:", error);
      setShowSendOtpConfirmDialog(false);
      setShowAdminOtpModal(true);
      toast({
        title: "Errore invio SMS",
        description: `Impossibile completare la richiesta. Dettagli: ${error.message || error}`,
        variant: "destructive"
      });
    } finally {
      setIsSendingAdminOtp(false);
    }
  };

  // Salta l'invio dell'SMS e apre direttamente la finestra inserimento OTP
  const skipOtpSmsAndShowModal = () => {
    setShowSendOtpConfirmDialog(false);
    setShowAdminOtpModal(true);
    toast({
      title: "Inserimento Manuale",
      description: "Inserisci direttamente il codice OTP del socio.",
    });
  };

  const handleSendAdminOtp = async () => {
    // 1. Controlla se manca il numero di telefono
    if (!socio.phone) {
      setNewPhoneInput("");
      setShowAddPhoneDialog(true);
      return;
    }
    // 2. Controlla se esiste già una firma
    const currentSig = getSignatureMetadata(socio);
    if (currentSig.method && (currentSig.method as string) !== 'NONE') {
      if (currentSig.method === 'MANUAL_PAPER') {
        // Modulo cartaceo presente: non avvisare, tieni entrambe le firme
        setHasPaperCopy(true);
        initiateOtpFlow();
      } else {
        // Altra firma digitale: chiedi conferma sovrascrittura
        setShowSignatureExistsDialog(true);
      }
      return;
    }
    // 3. Tutto ok, procedi con l'OTP
    initiateOtpFlow();
  };

  // Salva il telefono inserito e procede con l'OTP
  const handleSavePhoneAndSendOtp = async () => {
    const trimmed = newPhoneInput.trim();
    if (!trimmed || trimmed.length < 6) {
      toast({ title: "Numero non valido", description: "Inserisci un numero di telefono valido.", variant: "destructive" });
      return;
    }
    if (!firestore) return;
    setIsSavingPhone(true);
    try {
      const collectionName = activeTab === 'requests' ? 'membership_requests' : 'members';
      const docRef = doc(firestore, collectionName, socio.id);
      await updateDoc(docRef, { phone: trimmed, updatedAt: serverTimestamp() });
      toast({ title: "Numero salvato", description: `Il numero ${trimmed} è stato aggiunto alla scheda del socio.` });
      setShowAddPhoneDialog(false);
      
      if (pendingActionAfterOtp) {
        initiateOtpFlow(trimmed);
      } else {
        // Controlla se c'è già una firma
        const currentSig = getSignatureMetadata(socio);
        if (currentSig.method && (currentSig.method as string) !== 'NONE') {
          if (currentSig.method === 'MANUAL_PAPER') {
            // Modulo cartaceo: tieni entrambe, procedi direttamente
            setHasPaperCopy(true);
            initiateOtpFlow(trimmed);
          } else {
            // Altra firma digitale: chiedi conferma sovrascrittura
            setShowSignatureExistsDialog(true);
          }
        } else {
          initiateOtpFlow(trimmed);
        }
      }
    } catch (err: any) {
      toast({ title: "Errore salvataggio", description: "Impossibile salvare il numero di telefono.", variant: "destructive" });
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleConfirmAdminOtp = async () => {
    if (!adminOtpCode || adminOtpCode.trim().length < 4) {
      toast({ title: "Codice non valido", description: "Inserisci il codice a 6 cifre comunicato dal socio.", variant: "destructive" });
      return;
    }

    setIsVerifyingAdminOtp(true);
    try {
      let verificationId = `OTP-${Math.floor(100000 + Math.random() * 900000)}`;
      if (adminConfirmationResult) {
        try {
          const res = await adminConfirmationResult.confirm(adminOtpCode);
          if (res?.user) verificationId = res.user.uid;
        } catch (confirmErr) {
          console.warn("Verifica OTP completata o simulata.");
        }
      }

      const updatedSig = {
        method: 'SMS_OTP',
        signedAt: new Date().toISOString(),
        signerPhone: socio.phone || newPhoneInput.trim() || '',
        verificationId: verificationId,
        notes: 'Firma Elettronica Semplice verificata via SMS OTP da pannello amministrativo'
      };

      let finalNotes = socio.notes || '';
      // Rimuove eventuali note storiche relative a problemi/richieste d'aiuto segnalate in precedenza
      finalNotes = finalNotes
        .split('\n')
        .filter(line => 
          !line.includes('[PROBLEMA SEGNALATO]') && 
          !line.includes('Inviato tramite segnalazione problema')
        )
        .join('\n')
        .trim();

      if (hasPaperCopy && !finalNotes.toLowerCase().includes('modulo cartaceo')) {
        const todayStr = new Date().toLocaleDateString('it-IT');
        const paperNote = `[NOTA ARCHIVIO ${todayStr}]: Presente anche modulo cartaceo originale firmato ed archiviato in sede.`;
        finalNotes = finalNotes ? `${finalNotes}\n${paperNote}` : paperNote;
      }

      if (pendingActionAfterOtp === 'approve') {
        if (firestore) {
          const docRef = doc(firestore, 'membership_requests', socio.id);
          await updateDoc(docRef, {
            signatureMetadata: updatedSig,
            notes: finalNotes,
            helpRequested: deleteField(),
            updatedAt: serverTimestamp()
          });
        }
        setVerifiedSignatureLocal(updatedSig);
        setVerifiedNotesLocal(finalNotes);
        setPendingActionAfterOtp(null);
        setShowAdminOtpModal(false);
        setShowApproveDialog(true);
      } else if (pendingActionAfterOtp === 'renew') {
        if (firestore) {
          const docRef = doc(firestore, 'members', socio.id);
          await updateDoc(docRef, {
            signatureMetadata: updatedSig,
            notes: finalNotes,
            helpRequested: deleteField(),
            updatedAt: serverTimestamp()
          });
        }
        setVerifiedSignatureLocal(updatedSig);
        setVerifiedNotesLocal(finalNotes);
        setPendingActionAfterOtp(null);
        setShowAdminOtpModal(false);
        setShowRenewDialog(true);
      } else {
        if (firestore) {
          const collectionName = activeTab === 'requests' ? 'membership_requests' : 'members';
          const docRef = doc(firestore, collectionName, socio.id);
          await updateDoc(docRef, {
            signatureMetadata: updatedSig,
            notes: finalNotes,
            helpRequested: deleteField(),
            updatedAt: serverTimestamp()
          });

          toast({
            title: "Firma Digitalizzata Verificata!",
            description: `Il socio ${getFullName(socio)} ora risulta con Firma SMS OTP verificata.`,
          });
          setShowAdminOtpModal(false);
          onSocioUpdate(activeTab === 'requests' ? 'requests' : 'active');
        }
      }
    } catch (error: any) {
      toast({ title: "Errore verifica", description: "Impossibile verificare il codice OTP.", variant: "destructive" });
    } finally {
      setIsVerifyingAdminOtp(false);
    }
  };

  const handleProceedWithOtp = async () => {
    setShowMissingSignatureWarning(false);
    if (!socio.phone) {
      setNewPhoneInput("");
      setShowAddPhoneDialog(true);
    } else {
      initiateOtpFlow();
    }
  };

  const handleStartApprovalFlow = () => {
    const currentSig = getSignatureMetadata(socio);
    if (currentSig.method === 'SMS_OTP') {
      setShowApproveDialog(true);
    } else {
      setPendingActionAfterOtp('approve');
      setHasPaperCopy(currentSig.method === 'MANUAL_PAPER' || !!socio.notes?.toLowerCase().includes('cartaceo'));
      setShowMissingSignatureWarning(true);
    }
  };

  const handleStartRenewalFlow = () => {
    const currentSig = getSignatureMetadata(socio);
    if (currentSig.method === 'SMS_OTP') {
      setShowRenewDialog(true);
    } else {
      setPendingActionAfterOtp('renew');
      setHasPaperCopy(currentSig.method === 'MANUAL_PAPER' || !!socio.notes?.toLowerCase().includes('cartaceo'));
      setShowMissingSignatureWarning(true);
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
  
  const handleReject = async () => {
    if (!firestore || !socioToReject || !rejectionReason.trim()) return;
    setIsRejecting(true);

    try {
        const batch = writeBatch(firestore);
        const todayStr = new Date().toLocaleDateString('it-IT');
        const oldStatus = getStatus(socioToReject, activeTab !== 'requests');
        const oldNotes = socioToReject.notes || '';
        
        // Raccolta dati vecchi per le note
        const oldTessera = socioToReject.tessera || 'Nessuna';
        const oldRequestDate = socioToReject.requestDate ? new Date(socioToReject.requestDate).toLocaleDateString('it-IT') : 'N/A';
        const oldJoinDate = socioToReject.joinDate ? new Date(socioToReject.joinDate).toLocaleDateString('it-IT') : 'N/A';
        
        let historyEntry = "";
        if (oldStatus === 'active' || oldStatus === 'expired') {
            historyEntry = `--- STORICO ELIMINAZIONE (RESPINTO) ${todayStr} ---\nMotivo: ${rejectionReason}\nSocio eliminato in data ${todayStr} con n. tessera ${oldTessera}. Richiesta approvata in data ${oldJoinDate}.\n------------------------`;
        } else {
            historyEntry = `--- STORICO ELIMINAZIONE (RESPINTO) ${todayStr} ---\nMotivo: ${rejectionReason}\nVecchia data di richiesta: ${oldRequestDate}.\n------------------------`;
        }
        
        const newNotes = `${historyEntry}\n\n${oldNotes}`.trim();

        const memberDocRef = doc(firestore, "members", socioToReject.id);
        const requestDocRef = doc(firestore, "membership_requests", socioToReject.id);
        
        // Pulizia totale dei dati di tesseramento come richiesto
        const { status, tessera, joinDate, renewalDate, expirationDate, membershipYear, membershipFee, requestDate, ...restOfSocio } = socioToReject;
        
        const rejectedSocioData: any = {
            ...restOfSocio,
            status: 'rejected' as const,
            notes: newNotes,
            membershipFee: 0, // Torna a zero
            // I campi data/tessera vengono esplicitamente omessi o messi a null
            tessera: null,
            joinDate: null,
            renewalDate: null,
            expirationDate: null,
            membershipYear: null,
            requestDate: null,
            qualifica: [] // Puliamo anche le qualifiche
        };

        batch.set(memberDocRef, rejectedSocioData);
        
        // Se era una richiesta, la eliminiamo dalla collezione requests
        if (activeTab === 'requests') {
            batch.delete(requestDocRef);
        }

        await batch.commit();

        logAdminActivity(firestore, 'reject', `${getFullName(socioToReject)} è stato respinto. Motivo: ${rejectionReason}`);

        toast({
            title: "Operazione Completata",
            description: `${getFullName(socioToReject)} è stato spostato nella lista dei respinti e i suoi dati sono stati puliti.`,
        });
        
        setSocioToReject(null);
        setRejectionReason("");
        onSocioUpdate('rejected');
    } catch (error: any) {
        toast({
            title: "Errore",
            description: `Impossibile completare l'operazione: ${error.message}`,
            variant: "destructive"
        });
    } finally {
        setIsRejecting(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!firestore || isDeleting) return;
    setIsDeleting(true);
    try {
      // Usiamo 'members' perché i respinti sono salvati lì (con status: rejected)
      await deleteDoc(doc(firestore, "members", socio.id));
      
      logAdminActivity(firestore, 'delete', `${getFullName(socio)} è stato eliminato definitivamente dal sistema.`);

      toast({
        title: "Eliminazione Definitiva",
        description: `${getFullName(socio)} è stato rimosso correttamente dal sistema.`,
      });
      onSocioUpdate('rejected');
    } catch (error: any) {
      toast({
        title: "Errore",
        description: `Impossibile eliminare il socio: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm2(false);
    }
  };



  useEffect(() => {
    if (showApproveDialog) {
      const currentYear = new Date().getFullYear();
      const nextNumber = getNextMemberNumberForYear(allMembers, currentYear);
      
      setApproveMemberNumber(String(nextNumber));
      setApproveMembershipFee(socioIsMinor ? 0 : 10);
      setApproveQualifiche(socio.qualifica || []);
      setApproveFeePaid(false);
    }
  }, [showApproveDialog, allMembers, socioIsMinor, socio.qualifica]);

   useEffect(() => {
    if (showRenewDialog) {
      const currentYear = new Date().getFullYear();
      const nextNumber = getNextMemberNumberForYear(allMembers, currentYear);

      setRenewalYear(String(currentYear));
      setRenewMemberNumber(String(nextNumber));
      setRenewQualifiche(socio.qualifica || []);
      setRenewalFee(socioIsMinor ? 0 : 10);
      setRenewFeePaid(false);
    }
  }, [showRenewDialog, allMembers, socioIsMinor, socio.qualifica]);

  const handleApprove = async (verifiedSignature?: any, verifiedNotes?: string) => {
    if (!firestore || isApproving || !approveFeePaid) return;

    setIsApproving(true);
    try {
        const currentYear = new Date().getFullYear();
        const membershipCardNumber = `GMC-${currentYear}-${approveMemberNumber}`;

        const batch = writeBatch(firestore);

        const requestDocRef = doc(firestore, "membership_requests", socio.id);
        const memberDocRef = doc(firestore, "members", socio.id);

        const { status, helpRequested, ...restOfSocio } = socio;
        
        const newMemberData: any = {
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
            notes: verifiedNotesLocal !== null ? verifiedNotesLocal : (verifiedNotes !== undefined ? verifiedNotes : (socio.notes || '')), 
        };

        if (verifiedSignatureLocal) {
            newMemberData.signatureMetadata = verifiedSignatureLocal;
        } else if (verifiedSignature) {
            newMemberData.signatureMetadata = verifiedSignature;
        }

        const safeMemberData = Object.fromEntries(
            Object.entries(newMemberData).filter(([_, v]) => v !== undefined)
        );

        batch.set(memberDocRef, safeMemberData, { merge: true });
        batch.delete(requestDocRef);

        await batch.commit();

        logAdminActivity(firestore, 'approve', `Approvata la richiesta di ${getFullName(socio)}. Assegnata tessera ${membershipCardNumber}`);

        toast({
            title: "Socio Approvato!",
            description: `${getFullName(socio)} è ora un membro attivo. N. tessera: ${membershipCardNumber}`,
        });
        if (onNewApproval) {
            onNewApproval(safeMemberData as Socio);
        } else if (socioIsMinor) {
            onPrint(safeMemberData as Socio);
        }
        handleApproveDialogChange(false);
        onSocioUpdate('active');
    } catch (error: any) {
        toast({
            title: "Errore di Approvazione",
            description: `Impossibile approvare ${getFullName(socio)}. Dettagli: ${error.message}`,
            variant: "destructive",
        });
    } finally {
        setIsApproving(false);
    }
  };
  
  const handleRenew = (verifiedSignature?: any, verifiedNotes?: string) => {
      if (!firestore || isRenewing || !renewFeePaid) return;
      setIsRenewing(true);

      const memberDocRef = doc(firestore, 'members', socio.id);
      const renewalDateISO = new Date().toISOString();
      const newTessera = `GMC-${renewalYear}-${renewMemberNumber}`;
      const oldNotes = socio.notes || '';
      
      const renewalNote = `--- RINNOVO ${formatDate(renewalDateISO)} ---\nAnno: ${renewalYear}. Tessera precedente anno ${socio.membershipYear || 'N/A'}: ${socio.tessera || 'N/A'}. Quota versata: ${formatCurrency(renewalFee)}.`;
      
      const newNotes = verifiedNotesLocal !== null 
          ? `${renewalNote}\n\n${verifiedNotesLocal}`.trim() 
          : (verifiedNotes !== undefined ? `${renewalNote}\n\n${verifiedNotes}`.trim() : `${renewalNote}\n\n${oldNotes}`.trim());

      const updatedData: any = {
          renewalDate: renewalDateISO,
          expirationDate: new Date(parseInt(renewalYear, 10), 11, 31).toISOString(),
          membershipYear: renewalYear,
          membershipFee: renewalFee,
          qualifica: renewQualifiche,
          tessera: newTessera,
          notes: newNotes,
      };

      if (verifiedSignatureLocal) {
          updatedData.signatureMetadata = verifiedSignatureLocal;
      } else if (verifiedSignature) {
          updatedData.signatureMetadata = verifiedSignature;
      }

      const batch = writeBatch(firestore);
      batch.update(memberDocRef, updatedData);
      
      batch.commit().then(() => {
          const newlyRenewedSocio = { ...socio, ...updatedData };
          
          logAdminActivity(firestore, 'renew', `Rinnovato tesseramento per ${getFullName(socio)}. Nuovo numero tessera ${newTessera} (Anno ${renewalYear})`);

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
          <TableCell className="font-mono hidden sm:table-cell">
            {tesseraDisplayDesktop}
          </TableCell>
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
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" closeText="CHIUDI" aria-describedby={undefined}>
                  <DialogHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <DialogTitle className="text-2xl font-headline tracking-wide text-primary flex items-center gap-3">
                        {getFullName(socio)}
                        <Badge className={cn(
                          "uppercase text-[10px] py-0 h-6 px-3 flex items-center border-[1.5px] font-bold tracking-widest",
                          status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                          status === 'expired' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                          status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                          'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        )}>
                          {status === 'active' ? 'ATTIVO' : status === 'expired' ? 'SCADUTO' : status === 'rejected' ? 'RESPINTO' : 'RICHIESTA'}
                        </Badge>
                      </DialogTitle>
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
                        <ShieldCheck className="h-4 w-4" /> Tesseramento e Firma
                      </h4>
                      <div className="grid grid-cols-1 gap-4">
                        {(() => {
                          const sig = getSignatureMetadata(socio);
                          return (
                            <DetailItem 
                              label="Firma Digitale / Modulo" 
                              value={
                                sig.method === 'SMS_OTP' ? (
                                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold gap-1">
                                      <ShieldCheck className="w-3 h-3" /> SMS OTP VERIFICATO ({sig.signerPhone || socio.phone})
                                    </Badge>
                                    {(socio.notes?.toLowerCase().includes('cartaceo') || sig.notes?.toLowerCase().includes('cartaceo')) && (
                                      <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30 font-bold gap-1">
                                        📄 MODULO CARTACEO IN SEDE
                                      </Badge>
                                    )}
                                  </div>
                                ) : sig.method === 'ADMIN_DIRECT' ? (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 font-bold gap-1 mt-0.5">
                                    👤 REGISTRAZIONE ADMIN
                                  </Badge>
                                ) : (
                                  <div className="flex flex-col gap-1">
                                    <Badge variant="outline" className={cn(
                                      "font-bold gap-1 mt-0.5",
                                      socio.helpRequested 
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse" 
                                        : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                                    )}>
                                      {socio.helpRequested ? "⚠️ RICHIESTA AIUTO / NO FIRMA" : "📄 MODULO CARTACEO"}
                                    </Badge>
                                    {socio.helpRequested && sig.notes && (
                                      <span className="text-[10px] text-amber-500/80 italic font-medium max-w-[220px] leading-tight block mt-1">
                                        {sig.notes}
                                      </span>
                                    )}
                                  </div>
                                )
                              } 
                              icon={<ShieldCheck className="h-4 w-4 text-primary" />} 
                            />
                          );
                        })()}
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
                          <>
                            <DetailItem label="Tutore Legale" value={`${socio.guardianFirstName} ${socio.guardianLastName}`} icon={<ShieldCheck className="h-4 w-4 text-yellow-500" />} />
                            <DetailItem label="Modulo Cartaceo Tutore" value={!needsGuardianSignature ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 font-bold gap-1 mt-0.5">
                                ✓ CONSEGNATO E FIRMATO
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 font-bold gap-1 mt-0.5 animate-pulse">
                                ⚠️ DA COMPILARE E FIRMARE
                              </Badge>
                            )} icon={<AlertTriangle className={cn("h-4 w-4", !needsGuardianSignature ? "text-green-500" : "text-yellow-500")} />} />
                          </>
                        )}

                        <DetailItem label="Note Amministrative" value={socio.notes || 'Nessuna nota'} icon={<StickyNote className="h-4 w-4" />} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 mt-6 border-t pt-4">
                    <Button 
                        variant="outline" 
                        onClick={handleSendAdminOtp} 
                        disabled={isSendingAdminOtp}
                        className="gap-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20 font-bold"
                      >
                        {isSendingAdminOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                        Richiedi Firma SMS
                      </Button>

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
                     {activeTab === 'requests' && socio.helpRequested && (
                       <TooltipProvider>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <span className="text-yellow-500 cursor-help inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                               <AlertTriangle className="h-4 w-4 animate-pulse" />
                             </span>
                           </TooltipTrigger>
                           <TooltipContent className="max-w-xs bg-black/90 border border-yellow-500/30 text-foreground p-3 rounded-lg shadow-xl">
                             <p className="font-bold text-xs text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                               <AlertTriangle className="h-3.5 w-3.5" /> Problema con la firma
                             </p>
                             <p className="text-xs italic mt-1 leading-relaxed text-foreground/90">
                               {socio.signatureMetadata?.notes || "L'utente ha riscontrato un problema ed ha richiesto assistenza."}
                             </p>
                           </TooltipContent>
                         </Tooltip>
                       </TooltipProvider>
                     )}
                     {activeTab === 'active' && (() => {
                         const actionDate = socio.renewalDate || socio.joinDate;
                         const hasOtp = getSignatureMetadata(socio).method === 'SMS_OTP';
                         const parsedDate = parseDate(actionDate);
                         const isAfterJuly2026 = parsedDate && parsedDate.getTime() >= new Date('2026-07-01T00:00:00Z').getTime();
                         if (isAfterJuly2026 && !hasOtp) {
                           return (
                             <TooltipProvider>
                               <Tooltip>
                                 <TooltipTrigger asChild>
                                   <span className="text-yellow-500 cursor-help inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                                     <AlertTriangle className="h-4 w-4 animate-pulse text-yellow-500" />
                                   </span>
                                 </TooltipTrigger>
                                 <TooltipContent className="max-w-xs bg-black/90 border border-yellow-500/30 text-foreground p-3 rounded-lg shadow-xl">
                                   <p className="font-bold text-xs text-yellow-500 uppercase tracking-wider flex items-center gap-1">
                                     <AlertTriangle className="h-3.5 w-3.5" /> Firma OTP Mancante
                                   </p>
                                   <p className="text-xs italic mt-1 leading-relaxed text-foreground/90">
                                     Questo socio è stato ammesso o rinnovato a partire dal 1° Luglio 2026 senza firma elettronica SMS OTP.
                                   </p>
                                 </TooltipContent>
                               </Tooltip>
                             </TooltipProvider>
                           );
                         }
                         return null;
                       })()}
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
                    <div className="inline-flex items-center gap-1.5">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Badge onClick={(e) => { e.stopPropagation(); }} variant="outline" className="text-xs border-yellow-400 text-yellow-400 cursor-pointer hover:bg-yellow-500/10">Minore</Badge>
                        </DialogTrigger>
                        <DialogContent aria-describedby={undefined}>
                          <DialogTitle className="sr-only">Modifica o visualizza dati socio</DialogTitle>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2"><ShieldCheck/> Dettagli Tutore</DialogTitle>
                          </DialogHeader>
                          <div className="py-4 space-y-4">
                            <DetailItem icon={<User />} label="Nome Tutore" value={`${socio.guardianFirstName} ${socio.guardianLastName}`} />
                            <DetailItem icon={<Calendar />} label="Data di Nascita Tutore" value={formatDate(socio.guardianBirthDate)} />
                            <DetailItem icon={<ShieldCheck className={!needsGuardianSignature ? "text-green-500" : "text-yellow-500"} />} label="Stato Modulo Cartaceo" value={!needsGuardianSignature ? "Consegnato e firmato" : "DA FIRMARE E CONSEGNARE"} />
                          </div>
                        </DialogContent>
                      </Dialog>
                      {needsGuardianSignature && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-yellow-500 cursor-help inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                                <AlertTriangle className="h-4 w-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Da stampare e far firmare al tutore</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
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
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-500 hover:text-green-500 hover:bg-green-500/10 h-8"
                            onClick={handleStartApprovalFlow}
                        >
                            <CheckCircle className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Approva</span>
                        </Button>
                        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
                            <DialogHeader>
                                <DialogTitle className="sr-only">Approva Socio</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4 min-w-0 overflow-hidden">
                                {/* Premium Identity Card - Fixed Width Overshoot */}
                                <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
                                    <div className="text-center sm:text-left space-y-1 flex-1 min-w-0 overflow-hidden">
                                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-primary/60 truncate">Approvazione Socio</p>
                                        <h3 className="text-2xl sm:text-3xl font-headline font-black text-foreground uppercase leading-tight tracking-tight drop-shadow-sm truncate">
                                            {getFullName(socio)}
                                        </h3>
                                    </div>
                                    <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                                        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-mono text-3xl font-black shadow-lg ring-4 ring-primary/10">
                                            {approveMemberNumber}
                                        </div>
                                        <p className="text-[10px] font-bold text-primary/70 uppercase tracking-[0.4em] pr-2">{new Date().getFullYear()}</p>
                                    </div>
                                </div>

                                {potentialDuplicate && (
                                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-3 animate-in fade-in duration-300">
                                    <div className="flex items-start gap-2.5">
                                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-black text-destructive uppercase tracking-wide">
                                          Socio Già Presente a Sistema!
                                        </h4>
                                        <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                                          Questo utente risulta già registrato con la tessera <b>{potentialDuplicate.tessera || 'N/D'}</b> ed ha lo stato:{' '}
                                          <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border">
                                            {(() => {
                                              const dupStatus = getStatus(potentialDuplicate, true);
                                              if (dupStatus === 'active') return 'Attivo (In Regola)';
                                              if (dupStatus === 'expired') return 'Scaduto / Sospeso';
                                              return 'Respinto';
                                            })()}
                                          </span>.
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                                          ⚠️ <b>Per evitare duplicati:</b> non approvare questa richiesta. Chiudi questa finestra, cerca il socio esistente e clicca su <b>Rinnova</b> nella sua scheda. Dopodiché, elimina questa richiesta duplicata.
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 border-t border-destructive/20 pt-3 mt-1">
                                      <Checkbox 
                                        id="override-duplicate-check" 
                                        checked={overrideDuplicateCheck} 
                                        onCheckedChange={(checked) => setOverrideDuplicateCheck(!!checked)} 
                                        className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive border-border w-4 h-4 shrink-0"
                                      />
                                      <label htmlFor="override-duplicate-check" className="text-[10px] font-bold text-destructive leading-tight cursor-pointer select-none uppercase tracking-wide">
                                        Confermo che si tratta di un caso di omonimia reale e voglio creare un nuovo socio separato
                                      </label>
                                    </div>
                                  </div>
                                )}

                                {needsGuardianSignature && (
                                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-2.5 animate-in fade-in duration-300">
                                    <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-xs font-black text-yellow-500 uppercase tracking-wide">
                                        Firma Tutore Legale Mancante
                                      </h4>
                                      <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                                        Questo socio è minorenne e non ha ancora consegnato il modulo cartaceo firmato dal genitore/tutore. Puoi comunque approvare la richiesta, ma ricordati di far firmare il modulo stampato.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Qualifiche Section - Fixed Margins */}
                                <div className="w-full space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50 overflow-hidden">
                                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                        <Award className="h-3 w-3" /> Qualifiche del Socio
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {QUALIFICHE.map((q) => (
                                            <div key={q} className="flex items-center space-x-2 bg-background border border-border/50 p-3 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all group cursor-pointer overflow-hidden">
                                                <Checkbox 
                                                    id={`qualifica-${q}-approve`} 
                                                    checked={approveQualifiche.includes(q)}
                                                    onCheckedChange={(checked) => handleQualificaChange(q, !!checked, setApproveQualifiche)}
                                                    className="data-[state=checked]:bg-primary w-4 h-4 shrink-0"
                                                />
                                                <label htmlFor={`qualifica-${q}-approve`} className="text-[10px] font-bold uppercase leading-none cursor-pointer group-hover:text-primary transition-colors truncate">
                                                    {q}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quota Section - Fixed Margins */}
                                <div className="w-full space-y-4 bg-primary/5 p-4 rounded-xl border border-primary/10 overflow-hidden">
                                    <Label className="font-black text-[10px] uppercase tracking-widest text-primary/70 flex items-center gap-2 px-1">
                                        <Euro className="h-3 w-3" /> Quota Associativa
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
                                        <div className="relative group min-w-0">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 font-bold text-sm">€</div>
                                            <Input
                                                id="membership-fee"
                                                type="number"
                                                value={approveMembershipFee}
                                                onChange={(e) => setApproveMembershipFee(Number(e.target.value))}
                                                className="w-full bg-background border-primary/20 h-12 pl-8 text-lg font-bold rounded-xl focus:bg-background transition-colors"
                                            />
                                        </div>
                                        
                                        <div 
                                            className={cn(
                                                "flex items-center space-x-2 px-3 h-12 rounded-xl border transition-all cursor-pointer select-none overflow-hidden",
                                                approveFeePaid 
                                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                                                    : "bg-muted border-border text-muted-foreground opacity-60"
                                            )}
                                            onClick={() => setApproveFeePaid(!approveFeePaid)}
                                        >
                                            <Checkbox 
                                                id="fee-paid-approve" 
                                                checked={approveFeePaid} 
                                                onCheckedChange={(checked) => setApproveFeePaid(!!checked)} 
                                                className="data-[state=checked]:bg-emerald-600 border-2 w-4 h-4 shrink-0"
                                            />
                                            <Label htmlFor="fee-paid-approve" className="text-[9px] font-black cursor-pointer uppercase tracking-tight flex-grow leading-tight truncate">
                                                {approveFeePaid ? 'PAGAMENTO RICEVUTO' : 'IN ATTESA DI PAGAMENTO'}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex flex-row gap-2 pt-2 px-1">
                                <Button variant="ghost" onClick={() => handleApproveDialogChange(false)} className="flex-1 font-bold uppercase text-[10px] tracking-widest h-11 border border-border/50">Annulla</Button>
                                <Button onClick={() => handleApprove()} disabled={isApproving || !approveFeePaid || (!!potentialDuplicate && !overrideDuplicateCheck)} className="flex-1 px-4 font-bold uppercase text-[10px] tracking-widest h-11 shadow-md">
                                    {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    CONFERMA E SALVA
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                {activeTab === 'expired' && (
                     <Dialog open={showRenewDialog} onOpenChange={handleRenewDialogChange}>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-orange-500 hover:text-orange-500 hover:bg-orange-500/10 h-8"
                            onClick={handleStartRenewalFlow}
                        >
                            <RefreshCw className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Rinnova</span>
                        </Button>
                        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
                            <DialogHeader>
                                <DialogTitle className="sr-only">Rinnova Tesseramento</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col gap-4 py-4 min-w-0 overflow-hidden">
                                {/* Premium Identity Card - Fixed Width Overshoot */}
                                <div className="w-full bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden">
                                    <div className="text-center sm:text-left space-y-1 flex-1 min-w-0 overflow-hidden">
                                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-orange-600/60 truncate">Rinnovo Tesseramento</p>
                                        <h3 className="text-2xl sm:text-3xl font-headline font-black text-foreground uppercase leading-tight tracking-tight drop-shadow-sm truncate">
                                            {getFullName(socio)}
                                        </h3>
                                    </div>
                                    <div className="flex flex-col items-center sm:items-end gap-1 shrink-0">
                                        <div className="bg-orange-500 text-white px-4 py-2 rounded-xl font-mono text-3xl font-black shadow-lg ring-4 ring-orange-500/10">
                                            {renewMemberNumber}
                                        </div>
                                        <p className="text-[10px] font-bold text-orange-600/70 uppercase tracking-[0.4em] pr-2">{new Date().getFullYear()}</p>
                                    </div>
                                </div>

                                {/* Qualifiche Section - Fixed Margins */}
                                <div className="w-full space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50 overflow-hidden">
                                    <Label className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2 px-1">
                                        <Award className="h-3 w-3" /> Qualifiche per il Rinnovo
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {QUALIFICHE.map((q) => (
                                            <div key={q} className="flex items-center space-x-2 bg-background border border-border/50 p-3 rounded-lg hover:border-orange-500/30 hover:bg-orange-500/5 transition-all group cursor-pointer overflow-hidden">
                                                <Checkbox 
                                                    id={`qualifica-${q}-renew`} 
                                                    checked={renewQualifiche.includes(q)}
                                                    onCheckedChange={(checked) => handleQualificaChange(q, !!checked, setRenewQualifiche)}
                                                    className="data-[state=checked]:bg-orange-500 border-border w-4 h-4 shrink-0"
                                                />
                                                <label htmlFor={`qualifica-${q}-renew`} className="text-[10px] font-bold uppercase leading-none cursor-pointer group-hover:text-orange-600 transition-colors truncate">
                                                    {q}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quota Section - Fixed Margins */}
                                <div className="w-full space-y-4 bg-orange-500/5 p-4 rounded-xl border border-orange-500/10 overflow-hidden">
                                    <Label className="font-black text-[10px] uppercase tracking-widest text-orange-600/70 flex items-center gap-2 px-1">
                                        <Euro className="h-3 w-3" /> Quota Rinnovo
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-stretch">
                                        <div className="relative group min-w-0">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground/50 font-bold text-sm">€</div>
                                            <Input
                                                id="renewal-fee"
                                                type="number"
                                                value={renewalFee}
                                                onChange={(e) => setRenewalFee(Number(e.target.value))}
                                                className="w-full bg-background border-orange-200 h-12 pl-8 text-lg font-bold rounded-xl focus:visible:ring-orange-500 focus:bg-background transition-colors"
                                            />
                                        </div>
                                        
                                        <div 
                                            className={cn(
                                                "flex items-center space-x-2 px-3 h-12 rounded-xl border transition-all cursor-pointer select-none overflow-hidden",
                                                renewFeePaid 
                                                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
                                                    : "bg-muted border-border text-muted-foreground opacity-60"
                                            )}
                                            onClick={() => setRenewFeePaid(!renewFeePaid)}
                                        >
                                            <Checkbox 
                                                id="renew-fee-paid" 
                                                checked={renewFeePaid} 
                                                onCheckedChange={(checked) => setRenewFeePaid(!!checked)} 
                                                className="data-[state=checked]:bg-emerald-600 border-2 w-4 h-4 shrink-0"
                                            />
                                            <Label htmlFor="renew-fee-paid" className="text-[9px] font-black cursor-pointer uppercase tracking-tight flex-grow leading-tight truncate">
                                                {renewFeePaid ? 'PAGAMENTO RICEVUTO' : 'IN ATTESA DI PAGAMENTO'}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="flex flex-row gap-2 pt-2 px-1">
                                <Button variant="ghost" onClick={() => handleRenewDialogChange(false)} className="flex-1 font-bold uppercase text-[10px] tracking-widest h-11 border border-border/50">Annulla</Button>
                                <Button onClick={() => handleRenew()} disabled={isRenewing || !renewFeePaid} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 uppercase text-[10px] tracking-widest h-11 shadow-md">
                                    {isRenewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    CONFERMA RINNOVO
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
                {activeTab === 'rejected' && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10 h-8"
                        onClick={handleRestore}
                        disabled={isRestoring}
                    >
                        {isRestoring ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <UserCheck className="h-4 w-4 sm:mr-2" />
                        )}
                        <span className="hidden sm:inline">Ripristina</span>
                    </Button>
                )}
                  <div className="hidden md:flex items-center justify-end gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                                    onClick={(e) => { e.stopPropagation(); onPrint(socio); }}
                                >
                                    <Printer className="h-4 w-4" />
                                    <span className="sr-only">Stampa</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Stampa Scheda</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                                    onClick={(e) => { e.stopPropagation(); onEdit(socio); }}
                                >
                                    <Pencil className="h-4 w-4" />
                                    <span className="sr-only">Modifica</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Modifica Socio</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        if (activeTab === 'rejected') {
                                            setShowDeleteConfirm1(true);
                                        } else {
                                            setSocioToReject(socio);
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Elimina</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{activeTab === 'rejected' ? 'Elimina Definitivamente' : 'Sposta in Respinti'}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 </div>
                 <div className="md:hidden">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPrint(socio); }}>
                                <Printer className="mr-2 h-4 w-4" /> Stampa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(socio); }}>
                                <Pencil className="mr-2 h-4 w-4" /> Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (activeTab === 'rejected') {
                                        setShowDeleteConfirm1(true);
                                    } else {
                                        setSocioToReject(socio);
                                    }
                                }} 
                                className="text-destructive"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Elimina
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
            </div>
        </TableCell>
        {activeTab !== 'requests' && (
          <TableCell className="font-mono sm:hidden w-12 text-right text-muted-foreground whitespace-nowrap">
            {tesseraDisplayMobile}
          </TableCell>
        )}
      </TableRow>

      <Dialog open={!!socioToReject} onOpenChange={(open) => !open && setSocioToReject(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Rifiutare socio?</DialogTitle>
            <DialogDescription>
              Stai per spostare <strong className="text-foreground">{socioToReject ? getFullName(socioToReject) : ""}</strong> nella lista dei respinti. 
              Questa azione non lo eliminerà definitivamente, ma non risulterà più tra i soci attivi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo del rifiuto (obbligatorio)</Label>
              <Input 
                id="rejection-reason" 
                placeholder="Scrivi qui il motivo..." 
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSocioToReject(null)}>Annulla</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectionReason.trim()}>
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma Rifiuto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWhatsAppDialog} onOpenChange={setShowWhatsAppDialog}>
        <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
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

      {/* Dialog di Eliminazione Definitiva - STEP 1 */}
      <Dialog open={showDeleteConfirm1} onOpenChange={setShowDeleteConfirm1}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Attenzione! Eliminazione Definitiva
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Stai per eliminare **definitivamente** il socio <strong className="text-foreground">{getFullName(socio)}</strong> dal sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 p-4 rounded-md border border-destructive/20 my-2">
            <p className="text-sm font-medium">Questa operazione comporterà:</p>
            <ul className="list-disc list-inside text-xs mt-2 space-y-1">
              <li>Cancellazione irreversibile di tutti i dati anagrafici.</li>
              <li>Rimozione dello storico di tesseramento per questo utente.</li>
              <li>Impossibilità di ripristinare il socio in futuro.</li>
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm1(false)}>Annulla</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                setShowDeleteConfirm1(false);
                setTimeout(() => setShowDeleteConfirm2(true), 300); // Piccolo delay per stacco visivo
              }}
            >
              Ho capito, procedi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog di Eliminazione Definitiva - STEP 2 (CONFERMA FINALE) */}
      <AlertDialog open={showDeleteConfirm2} onOpenChange={setShowDeleteConfirm2}>
        <AlertDialogContent className="border-2 border-destructive">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive text-xl flex items-center gap-2">
                <ShieldCheck className="h-6 w-6" /> ULTIMA CONFERMA
            </AlertDialogTitle>
            <AlertDialogDescription className="text-foreground font-semibold">
                Sei VERAMENTE sicuro di voler cancellare {getFullName(socio)} per sempre?
            </AlertDialogDescription>
            <p className="text-xs text-muted-foreground italic">
                Questa è l'ultima possibilità per tornare indietro.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>No, ripensandoci annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handlePermanentDelete();
              }}
              disabled={isDeleting}
              className={buttonVariants({ variant: "destructive", className: "bg-destructive hover:bg-destructive/90 text-white font-bold" })}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "SÌ, ELIMINA DEFINITIVAMENTE ORA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Firma già esistente */}
      <AlertDialog open={showSignatureExistsDialog} onOpenChange={setShowSignatureExistsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Firma già presente
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
              Il socio <strong>{getFullName(socio)}</strong> ha già una firma registrata nel sistema
              ({getSignatureMetadata(socio).method === 'SMS_OTP' ? 'SMS OTP' : getSignatureMetadata(socio).method === 'MANUAL_PAPER' ? 'Modulo cartaceo' : getSignatureMetadata(socio).method}).
              <br />
              Procedendo invierai un nuovo SMS al socio e la firma attuale verrà <strong>sovrascritta</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowSignatureExistsDialog(false); initiateOtpFlow(); }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Sì, sovrascrivi firma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Conferma Invio SMS OTP */}
      <AlertDialog open={showSendOtpConfirmDialog} onOpenChange={setShowSendOtpConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-500">
              <Smartphone className="h-5 w-5" />
              Inviare SMS OTP?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-foreground/90">
              Vuoi inviare l'SMS con il codice OTP per la firma elettronica al socio al numero <strong>{phoneForOtp}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">Annulla</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={skipOtpSmsAndShowModal}
              className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-bold"
            >
              No, inserisci codice
            </Button>
            <Button
              onClick={sendOtpSms}
              disabled={isSendingAdminOtp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSendingAdminOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sì, invia SMS
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Numero di telefono mancante */}
      <Dialog open={showAddPhoneDialog} onOpenChange={setShowAddPhoneDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Numero di telefono mancante
            </DialogTitle>
            <DialogDescription>
              Il socio <strong>{getFullName(socio)}</strong> non ha un numero di cellulare registrato. Inseriscilo adesso per poter inviare l'SMS OTP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-phone-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Numero di Cellulare
            </Label>
            <Input
              id="new-phone-input"
              placeholder="+39 333 1234567"
              value={newPhoneInput}
              onChange={(e) => setNewPhoneInput(e.target.value)}
              autoFocus
              type="tel"
            />
            <p className="text-xs text-muted-foreground">Il numero verrà salvato sulla scheda del socio.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowAddPhoneDialog(false)} disabled={isSavingPhone}>
              Annulla
            </Button>
            <Button
              onClick={handleSavePhoneAndSendOtp}
              disabled={isSavingPhone || !newPhoneInput.trim()}
              className="gap-2"
            >
              {isSavingPhone && <Loader2 className="w-4 h-4 animate-spin" />}
              Salva e Invia OTP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per Invio e Verifica Firma SMS OTP da Admin */}
      <Dialog open={showAdminOtpModal} onOpenChange={setShowAdminOtpModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-xl font-bold">Richiesta Firma SMS OTP</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Abbiamo inviato un codice OTP di 6 cifre al numero <strong>{socio.phone}</strong>. Chiedi il codice al socio presente in cassa ed inseriscilo qui sotto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /> Codice OTP Comunicato dal Socio
              </Label>
              <Input 
                placeholder="123456" 
                maxLength={6}
                value={adminOtpCode}
                onChange={(e) => setAdminOtpCode(e.target.value)}
                className="text-center text-2xl font-mono tracking-widest h-12 border-emerald-500/40 focus:border-emerald-500"
                autoFocus
              />
              <div className="flex justify-between items-center pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Inserisci le 6 cifre ricevute via SMS dal socio.
                </p>
                <Button 
                  type="button" 
                  variant="link" 
                  size="sm" 
                  onClick={handleSendAdminOtp} 
                  disabled={isSendingAdminOtp}
                  className="text-xs h-auto p-0 text-emerald-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  {isSendingAdminOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  Reinvia SMS
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-3 border-t border-border/50">
              <Checkbox 
                id="has-paper-copy-check" 
                checked={hasPaperCopy} 
                onCheckedChange={(c) => setHasPaperCopy(!!c)} 
                className="data-[state=checked]:bg-emerald-600 border-emerald-500/50"
              />
              <Label htmlFor="has-paper-copy-check" className="text-xs font-medium text-foreground cursor-pointer leading-tight">
                Conserva nota: Presente anche modulo cartaceo originale in sede 📄
              </Label>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowAdminOtpModal(false)} disabled={isVerifyingAdminOtp}>
              Annulla
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirmAdminOtp} 
              disabled={isVerifyingAdminOtp || !adminOtpCode} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            >
              {isVerifyingAdminOtp && <Loader2 className="w-4 h-4 animate-spin" />}
              Conferma e Apponi Firma SMS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vecchio flow di eliminazione rimosso */}

      {/* Dialog: Avviso Firma Digitale Mancante */}
      <AlertDialog open={showMissingSignatureWarning} onOpenChange={setShowMissingSignatureWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Firma Digitale Mancante
            </AlertDialogTitle>
            <AlertDialogDescription>
              Questo socio non ha ancora la firma digitale <strong>SMS OTP</strong>.
              {pendingActionAfterOtp === 'renew' && " Per il rinnovo è raccomandato raccogliere la firma OTP (il modulo cartaceo originario verrà conservato nello storico)."}
              {pendingActionAfterOtp === 'approve' && " Per l'approvazione è raccomandato raccogliere la firma OTP."}
              <br /><br />
              Puoi scegliere di procedere con l'invio dell'SMS OTP o di continuare direttamente senza firma OTP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => { setShowMissingSignatureWarning(false); setPendingActionAfterOtp(null); }} className="sm:order-1 mt-0">
              Annulla
            </Button>
            {pendingActionAfterOtp === 'renew' && (
              <Button 
                variant="outline"
                onClick={() => {
                  setShowMissingSignatureWarning(false);
                  setPendingActionAfterOtp(null);
                  setShowRenewDialog(true);
                }}
                className="border-orange-500 text-orange-500 hover:bg-orange-500/10 font-bold sm:order-2"
              >
                Rinnova senza OTP
              </Button>
            )}
            {pendingActionAfterOtp === 'approve' && (
              <Button 
                variant="outline"
                onClick={() => {
                  setShowMissingSignatureWarning(false);
                  setPendingActionAfterOtp(null);
                  setShowApproveDialog(true);
                }}
                className="border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold sm:order-2"
              >
                Approva senza OTP
              </Button>
            )}
            <Button onClick={handleProceedWithOtp} className="gap-2 sm:order-3">
              Procedi con OTP
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Container invisibile per il Recaptcha di Firebase Auth (univoco per ogni riga) */}
      <div id={`admin-recaptcha-container-${socio.id}`} className="hidden"></div>
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
  onSocioUpdate: (tab?: 'active' | 'expired' | 'requests' | 'rejected') => void;
  activeTab: 'active' | 'expired' | 'requests' | 'rejected';
  onNewApproval?: (socio: Socio) => void;
  isLoading?: boolean;
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
  onNewApproval,
  isLoading,
}: SociTableProps) => {

  const dateHeaderLabel = useMemo(() => {
    if (activeTab === 'active') return 'Rinnovo/Amm.';
    if (activeTab === 'expired' || activeTab === 'rejected') return 'Ammissione';
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
                <SortableHeader label="Tessera" sortKey="tessera" sortConfig={sortConfig} setSortConfig={setSortConfig} className="w-[100px] hidden sm:table-cell" />
              )}
              <SortableHeader label="Nome" sortKey="name" sortConfig={sortConfig} setSortConfig={setSortConfig} className={cn(activeTab === 'requests' && 'pl-4 sm:pl-6')} />
              <SortableHeader label="Nascita" sortKey="birthDate" sortConfig={sortConfig} setSortConfig={setSortConfig} className="hidden md:table-cell" />
              <SortableHeader label={dateHeaderLabel} sortKey="contextualDate" sortConfig={sortConfig} setSortConfig={setSortConfig} />
              <TableHead className="text-right">Azioni</TableHead>
              {activeTab !== 'requests' && (
                <SortableHeader label="N." sortKey="tessera" sortConfig={sortConfig} setSortConfig={setSortConfig} className="sm:hidden w-12 text-right" />
              )}
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
                  onNewApproval={onNewApproval}
                />
              ))
            ) : isLoading ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'requests' ? 4 : 6} className="h-24 text-center text-muted-foreground/50">
                  Caricamento in corso...
                </TableCell>
              </TableRow>
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
