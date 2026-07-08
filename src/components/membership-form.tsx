"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { differenceInYears } from 'date-fns';
import { useSearchParams, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, ArrowLeft, PartyPopper, Info, Home, List, User, Smartphone, KeyRound, ShieldCheck, RotateCcw, AlertTriangle, X, CheckCircle2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useFirestore, useAuth, addDocumentNonBlocking, logAdminActivity } from "@/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, getAuth } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import { doc, getDoc, collection, serverTimestamp } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useLanguage } from "./language-provider";
import { normalizeSocioData, parseDate, toTitleCase } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUTO_TEXT } from "@/lib/statuto";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const getSecondaryAuth = () => {
  if (typeof window === 'undefined') return null;
  const secondaryApp = getApps().find(app => app.name === 'phone-verifier') || initializeApp(firebaseConfig, 'phone-verifier');
  return getAuth(secondaryApp);
};

// Safari/iOS blocca i cookie di terze parti (ITP) rendendo il reCAPTCHA invisibile non funzionante.
// In quel caso usiamo il reCAPTCHA visibile (size: 'normal') che non dipende da cookie.
const isSafariBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iP(hone|od|ad)/.test(ua) || (/Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua));
};

export function MembershipForm() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [reportedProblem, setReportedProblem] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const firestore = useFirestore();
  const auth = useAuth();
  const [isMinor, setIsMinor] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  // SMS OTP Verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<any>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [editablePhone, setEditablePhone] = useState("");
  const [showConfirmProblemModal, setShowConfirmProblemModal] = useState(false);
  const [problemDescription, setProblemDescription] = useState("");
  
  // Guardian SMS OTP Verification states
  const [guardianSignatureMetadata, setGuardianSignatureMetadata] = useState<any>(null);
  const [guardianOtpSent, setGuardianOtpSent] = useState(false);
  const [guardianOtpCode, setGuardianOtpCode] = useState("");
  const [isSendingGuardianOtp, setIsSendingGuardianOtp] = useState(false);
  const [isVerifyingGuardianOtp, setIsVerifyingGuardianOtp] = useState(false);
  const [guardianConfirmationResult, setGuardianConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [editableGuardianPhone, setEditableGuardianPhone] = useState("");

  // Cooldown states for SMS OTP requests (prevent frequent clicks)
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [guardianOtpCooldown, setGuardianOtpCooldown] = useState(0);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => {
      setOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (guardianOtpCooldown <= 0) return;
    const timer = setTimeout(() => {
      setGuardianOtpCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [guardianOtpCooldown]);

  useEffect(() => {
    setMounted(true);
    setIsSafari(isSafariBrowser());
  }, []);

  const cameFromAdmin = searchParams.get('from') === 'admin';

  const formSchema = useMemo(() => z.object({
    gender: z.enum(["male", "female"], {
      required_error: t('validation.genderRequired'),
    }),
    firstName: z.string().min(2, { message: t('validation.firstNameMin') }),
    lastName: z.string().min(2, { message: t('validation.lastNameMin') }),
    email: z.string().email({ message: t('validation.emailInvalid') }).optional().or(z.literal('')),
    phone: z.string().optional(),
    birthPlace: z.string().min(2, { message: t('validation.birthPlaceInvalid') }),
    birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: t('validation.birthDateInvalid') }),
    fiscalCode: z.string().optional(),
    address: z.string().min(5, { message: t('validation.addressInvalid') }),
    city: z.string().min(2, { message: t('validation.cityInvalid') }),
    province: z.string().length(2, { message: t('validation.provinceLength') }),
    postalCode: z.string().length(5, { message: t('validation.postalCodeLength') }),
    whatsappConsent: z.boolean().default(false),
    legalConsent: z.boolean().refine((val) => val === true, { message: t('validation.legalConsentRequired') }),
    guardianFirstName: z.string().optional(),
    guardianLastName: z.string().optional(),
    guardianBirthDate: z.string().optional(),
    guardianPhone: z.string().optional(),
  }).refine(data => {
      if (!data.birthDate || !mounted) return true;
      const age = differenceInYears(new Date(), new Date(data.birthDate));
      if (age < 18) {
          return !!data.guardianFirstName && !!data.guardianLastName && !!data.guardianBirthDate && !!data.guardianPhone;
      }
      return true;
  }, {
      message: t('validation.guardianRequired'),
      path: ["guardianFirstName"],
  }), [t, mounted]);

  type FormValues = z.infer<typeof formSchema>;

  const baseSteps = useMemo(() => [
    { id: 1, fields: ["gender"] as const, title: t('steps.gender.title'), icon: <User className="w-5 h-5" /> },
    { id: 2, fields: ["firstName", "lastName"] as const, title: t('steps.name.title'), icon: <Info className="w-5 h-5" /> },
    { id: 3, fields: ["birthDate", "birthPlace"] as const, title: t('steps.birth.title'), icon: <PartyPopper className="w-5 h-5" /> },
    { id: 4, fields: ["fiscalCode"] as const, title: t('steps.fiscalCode.title'), icon: <List className="w-5 h-5" /> },
    { id: 5, fields: ["address", "city", "province", "postalCode"] as const, title: t('steps.address.title'), icon: <Home className="w-5 h-5" /> },
    { id: 6, fields: ["email", "phone", "whatsappConsent"] as const, title: t('steps.contact.title'), icon: <Info className="w-5 h-5" /> },
    { id: 7, fields: ["legalConsent"] as const, title: t('steps.privacy.title'), icon: <Info className="w-5 h-5" /> },
  ], [t]);

  const guardianStep = useMemo(() => ({
    id: 8,
    fields: ["guardianFirstName", "guardianLastName", "guardianBirthDate", "guardianPhone"] as const,
    title: t('steps.guardian.title'),
    icon: <User className="w-5 h-5 text-amber-500" />,
  }), [t]);


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: "+39 ",
      birthPlace: "",
      birthDate: "",
      fiscalCode: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      whatsappConsent: false,
      legalConsent: false,
      guardianFirstName: "",
      guardianLastName: "",
      guardianBirthDate: "",
      guardianPhone: "+39 ",
    },
    mode: "onChange",
  });

  const birthDate = form.watch("birthDate");
  const phoneValue = form.watch("phone");

  // Determiniamo se è stato inserito un numero di telefono reale (oltre il prefisso)
  const isPhoneEntered = useMemo(() => {
    return phoneValue && phoneValue.trim().length > 4;
  }, [phoneValue]);

  // Se il telefono viene rimosso, togliamo automaticamente il consenso WhatsApp
  useEffect(() => {
    if (!isPhoneEntered && form.getValues("whatsappConsent")) {
      form.setValue("whatsappConsent", false);
    }
  }, [isPhoneEntered, form]);

  const steps = isMinor ? [...baseSteps.slice(0, 3), guardianStep, ...baseSteps.slice(3)] : baseSteps;
  
  // Helpers per i selettori di data separati
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  }, []);

  const months = useMemo(() => {
    const locale = language === 'en' ? 'en-US' : 'it-IT';
    return Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2021, i))
    }));
  }, [language]);

  const days = useMemo(() => {
     return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  }, []);

  const handleDateChange = (type: 'day' | 'month' | 'year', value: string, currentVal: string | undefined, onChange: (val: string) => void) => {

    const date = parseDate(currentVal) || new Date(2000, 0, 1);
    let y = date.getFullYear();
    let m = date.getMonth();
    let d = date.getDate();

    if (type === 'year') y = parseInt(value, 10);
    if (type === 'month') m = parseInt(value, 10) - 1;
    if (type === 'day') d = parseInt(value, 10);

    // Formattiamo come YYYY-MM-DD per coerenza con il backend e Zod
    const newDateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange(newDateStr);
  };
  
  async function executeFinalSubmission(values: FormValues, signatureMetadata: any) {
    if (!firestore) {
      throw new Error("Firestore is not initialized");
    }

    const cleanedValues = normalizeSocioData(values);

    // Se il socio è minorenne e manca la firma OTP del tutore, segnaliamo che serve il modulo cartaceo del tutore
    const age = values.birthDate ? differenceInYears(new Date(), new Date(values.birthDate)) : 99;
    const isMinorMember = age < 18;
    const bothOtpSigned = isMinorMember && guardianSignatureMetadata?.method === 'SMS_OTP' && signatureMetadata.method === 'SMS_OTP';
    const guardianPaperRequired = isMinorMember && !guardianSignatureMetadata;

    const membershipRequestData = {
      ...cleanedValues,
      privacyConsent: values.legalConsent,
      statuteConsent: values.legalConsent,
      requestDate: serverTimestamp(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
      signatureMetadata,
      guardianSignatureMetadata: guardianSignatureMetadata || null,
      guardianPaperRequired: guardianPaperRequired || false,
      helpRequested: signatureMetadata.helpRequested || false,
    };
    
    const requestsCollection = collection(firestore, 'membership_requests');
    addDocumentNonBlocking(requestsCollection, membershipRequestData);
    logAdminActivity(firestore, 'new_request', `Arrivata nuova richiesta (${signatureMetadata.method === 'SMS_OTP' ? 'Firmata via SMS' : 'Inserimento Admin'}) da parte di ${values.firstName} ${values.lastName}${guardianPaperRequired ? ' - FIRMA TUTORE DA ACQUISIRE' : bothOtpSigned ? ' - Doppia firma OTP' : ''}`);
    setIsSubmitted(true);
  }

  async function processForm(values: FormValues) {
    if (cameFromAdmin) {
      setIsSubmitting(true);
      try {
        await executeFinalSubmission(values, {
          method: 'ADMIN_DIRECT',
          signedAt: new Date().toISOString(),
          notes: 'Inserimento diretto da pannello amministrativo'
        });
      } catch (error) {
        toast({
          title: t('submission.error.title'),
          description: t('submission.error.description'),
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setPendingFormValues(values);
      setEditablePhone(values.phone || "");
      setShowOtpModal(true);
    }
  }

  const handleSendOtp = async (phoneOverride?: string) => {
    const rawPhoneVal = phoneOverride || editablePhone || pendingFormValues?.phone;
    if (!rawPhoneVal) {
      toast({ title: "Numero non valido", description: "Inserisci un numero di telefono valido.", variant: "destructive" });
      return;
    }
    setIsSendingOtp(true);
    try {
      let rawPhone = String(rawPhoneVal).replace(/\s+/g, '');
      let phone = rawPhone;
      if (phone.startsWith('00')) {
        phone = `+${phone.slice(2)}`;
      }
      if (!phone.startsWith('+')) {
        if (phone.startsWith('39') && phone.length >= 10) {
          phone = `+${phone}`;
        } else if (phone.startsWith('386') && phone.length >= 11) {
          phone = `+${phone}`;
        } else if (phone.startsWith('43') && phone.length >= 9) {
          phone = `+${phone}`;
        } else if (phone.startsWith('41') && phone.length >= 9) {
          phone = `+${phone}`;
        } else if (phone.startsWith('44') && phone.length >= 10) {
          phone = `+${phone}`;
        } else if ((phone.startsWith('06') || phone.startsWith('07') || phone.startsWith('04') || phone.startsWith('03') || phone.startsWith('05')) && phone.length === 9) {
          // Numero locale sloveno (es. 041 123 456 = 9 cifre con 0 iniziale)
          phone = `+386${phone.slice(1)}`;
        } else {
          phone = `+39${phone.replace(/^0+/, '')}`;
        }
      }

      // Strip leading zero after country prefix for SI (+386), AT (+43), CH (+41), GB (+44)
      if (phone.startsWith('+3860')) {
        phone = `+386${phone.slice(5)}`;
      } else if (phone.startsWith('+430')) {
        phone = `+43${phone.slice(4)}`;
      } else if (phone.startsWith('+410')) {
        phone = `+41${phone.slice(4)}`;
      } else if (phone.startsWith('+440')) {
        phone = `+44${phone.slice(4)}`;
      }

      if (auth) {
        let recaptcha = (window as any).recaptchaVerifier;
        if (recaptcha) {
          try {
            recaptcha.clear();
          } catch (e) {
            console.warn("Error clearing recaptcha verifier:", e);
          }
        }
        
        // Creiamo sempre un'istanza fresca per evitare token reCAPTCHA scaduti o già usati
        recaptcha = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: isSafariBrowser() ? 'normal' : 'invisible',
        });
        (window as any).recaptchaVerifier = recaptcha;
        
        const result = await signInWithPhoneNumber(auth, phone, recaptcha);
        setConfirmationResult(result);
      }
      setOtpSent(true);
      setOtpCooldown(30); // Start 30s cooldown
      toast({
        title: "Codice SMS Inviato!",
        description: `Abbiamo inviato un codice OTP al numero ${phone}.`,
      });
    } catch (error: any) {
      console.error("SMS Sending error:", error);
      toast({
        title: "Errore Invio SMS",
        description: error.message || "Impossibile inviare l'SMS OTP. Verifica il numero o riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      toast({
        title: "Codice non valido",
        description: "Inserisci il codice OTP a 6 cifre ricevuto via SMS.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const actualCode = otpCode.trim();
      let verificationId = `OTP-${actualCode}`;
      if (confirmationResult) {
        const apiKey = firebaseConfig.apiKey;
        if (!apiKey) {
          throw new Error("Firebase API Key is missing");
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionInfo: confirmationResult.verificationId,
              code: actualCode,
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || "Invalid OTP code";
          throw new Error(errMsg);
        }

        const resData = await response.json();
        if (resData?.localId) {
          verificationId = `OTP-${actualCode} (FB: ${resData.localId})`;
        }
      }

      await executeFinalSubmission(pendingFormValues, {
        method: 'SMS_OTP',
        signedAt: new Date().toISOString(),
        signerPhone: pendingFormValues?.phone || '',
        verificationId: verificationId,
        notes: 'Firma Elettronica Semplice verificata via SMS OTP (Firebase Auth)'
      });
      setShowOtpModal(false);
    } catch (error: any) {
      console.error("OTP Verification Error:", error);
      const isOtpError = error.message && (
        error.message.includes("INVALID_CODE") || 
        error.message.includes("session expired") || 
        error.message.includes("code") ||
        error.message.includes("SESSION_EXPIRED")
      );
      toast({
        title: isOtpError ? "Codice OTP errato" : t('submission.error.title'),
        description: isOtpError 
          ? "Il codice inserito non è corretto o è scaduto. Verifica l'SMS e riprova." 
          : t('submission.error.description'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendGuardianOtp = async (phoneOverride?: string) => {
    const rawPhoneVal = phoneOverride || editableGuardianPhone || form.getValues("guardianPhone");
    if (!rawPhoneVal) {
      toast({ title: "Numero non valido", description: "Inserisci il numero di telefono del tutore.", variant: "destructive" });
      return;
    }
    setIsSendingGuardianOtp(true);
    try {
      let rawPhone = String(rawPhoneVal).replace(/\s+/g, '');
      let phone = rawPhone;
      if (phone.startsWith('00')) {
        phone = `+${phone.slice(2)}`;
      }
      if (!phone.startsWith('+')) {
        if (phone.startsWith('39') && phone.length >= 10) {
          phone = `+${phone}`;
        } else if (phone.startsWith('386') && phone.length >= 11) {
          phone = `+${phone}`;
        } else if (phone.startsWith('43') && phone.length >= 9) {
          phone = `+${phone}`;
        } else if (phone.startsWith('41') && phone.length >= 9) {
          phone = `+${phone}`;
        } else if (phone.startsWith('44') && phone.length >= 10) {
          phone = `+${phone}`;
        } else if ((phone.startsWith('06') || phone.startsWith('07') || phone.startsWith('04') || phone.startsWith('03') || phone.startsWith('05')) && phone.length === 9) {
          // Numero locale sloveno (es. 041 123 456 = 9 cifre con 0 iniziale)
          phone = `+386${phone.slice(1)}`;
        } else {
          phone = `+39${phone.replace(/^0+/, '')}`;
        }
      }

      // Strip leading zero after country prefix for SI (+386), AT (+43), CH (+41), GB (+44)
      if (phone.startsWith('+3860')) {
        phone = `+386${phone.slice(5)}`;
      } else if (phone.startsWith('+430')) {
        phone = `+43${phone.slice(4)}`;
      } else if (phone.startsWith('+410')) {
        phone = `+41${phone.slice(4)}`;
      } else if (phone.startsWith('+440')) {
        phone = `+44${phone.slice(4)}`;
      }

      const activeAuth = cameFromAdmin ? (getSecondaryAuth() || auth) : auth;
      if (activeAuth) {
        // Usiamo un container SEPARATO dal flusso principale per evitare
        // l'errore "reCAPTCHA has already been rendered in this element"
        let recaptcha = (window as any).recaptchaVerifierGuardian;
        if (recaptcha) {
          try {
            recaptcha.clear();
          } catch (e) {
            console.warn("Error clearing guardian recaptcha:", e);
          }
          delete (window as any).recaptchaVerifierGuardian;
        }

        recaptcha = new RecaptchaVerifier(activeAuth, 'recaptcha-container-guardian', {
          size: isSafariBrowser() ? 'normal' : 'invisible',
        });
        (window as any).recaptchaVerifierGuardian = recaptcha;

        const result = await signInWithPhoneNumber(activeAuth, phone, recaptcha);
        setGuardianConfirmationResult(result);
      }
      setGuardianOtpSent(true);
      setGuardianOtpCooldown(30); // Start 30s cooldown
      toast({
        title: "Codice SMS Inviato!",
        description: `Abbiamo inviato un codice OTP al numero del tutore ${phone}.`,
      });
    } catch (error: any) {
      console.error("SMS Sending error:", error);
      toast({
        title: "Errore Invio SMS",
        description: error.message || "Impossibile inviare l'SMS OTP. Verifica il numero o riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsSendingGuardianOtp(false);
    }
  };



  const handleConfirmGuardianOtp = async () => {
    if (!guardianOtpCode || guardianOtpCode.trim().length < 4) {
      toast({
        title: "Codice non valido",
        description: "Inserisci il codice OTP a 6 cifre ricevuto via SMS.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingGuardianOtp(true);
    try {
      const actualCode = guardianOtpCode.trim();
      let verificationId = `OTP-${actualCode}`;
      if (guardianConfirmationResult) {
        const apiKey = firebaseConfig.apiKey;
        if (!apiKey) {
          throw new Error("Firebase API Key is missing");
        }

        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionInfo: guardianConfirmationResult.verificationId,
              code: actualCode,
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errMsg = errData?.error?.message || "Invalid OTP code";
          throw new Error(errMsg);
        }

        const resData = await response.json();
        if (resData?.localId) {
          verificationId = `OTP-${actualCode} (FB: ${resData.localId})`;
        }
      }

      setGuardianSignatureMetadata({
        method: 'SMS_OTP',
        signedAt: new Date().toISOString(),
        signerPhone: editableGuardianPhone || form.getValues("guardianPhone") || '',
        verificationId: verificationId,
        notes: 'Firma Elettronica Semplice del Tutore verificata via SMS OTP (Firebase Auth)'
      });
      toast({
        title: "Firma Tutore Apposta!",
        description: "Il tutore ha firmato digitalmente con successo.",
      });
    } catch (error: any) {
      console.error("Guardian OTP Verification Error:", error);
      const isOtpError = error.message && (
        error.message.includes("INVALID_CODE") || 
        error.message.includes("session expired") || 
        error.message.includes("code") ||
        error.message.includes("SESSION_EXPIRED")
      );
      toast({
        title: isOtpError ? "Codice OTP errato" : "Errore verifica",
        description: isOtpError 
          ? "Il codice inserito non è corretto o è scaduto. Verifica l'SMS e riprova." 
          : "Impossibile verificare la firma del tutore.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingGuardianOtp(false);
    }
  };

  const handleProblemSignal = async () => {
    if (!pendingFormValues) return;
    setIsSubmitting(true);
    try {
      const problemNotes = problemDescription.trim()
        ? `[PROBLEMA SEGNALATO]: ${problemDescription.trim()}`
        : 'Inviato tramite segnalazione problema dal modulo online (Firma da acquisire in sede/cassa)';

      await executeFinalSubmission(pendingFormValues, {
        method: 'MANUAL_PAPER',
        signedAt: new Date().toISOString(),
        notes: problemNotes,
        helpRequested: true
      });
      setShowOtpModal(false);
      setReportedProblem(true);
    } catch (error) {
      toast({
        title: t('submission.error.title'),
        description: t('submission.error.description'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  type FieldName = keyof FormValues;

  const nextStep = async () => {
    const fields = steps[currentStep].fields;
    const output = await form.trigger(fields as any, { shouldFocus: true });


    if (!output) return;

    if (steps[currentStep].id === 3) {
      if(birthDate && mounted) {
        const age = differenceInYears(new Date(), new Date(birthDate));
        setIsMinor(age < 18);
      } else {
        setIsMinor(false);
      }
    }
    
    if (currentStep < steps.length - 1) {
        setCurrentStep(step => step + 1);
    } else {
        await form.handleSubmit(processForm)();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(step => step - 1);
    }
  };
  
  const resetForm = () => {
    form.reset();
    setCurrentStep(0);
    setIsMinor(false);
    setIsSubmitted(false);
    setReportedProblem(false);
    if(cameFromAdmin) {
        router.push('/admin/elenco');
    }
  }
  
  useEffect(() => {
    if(currentStep > 0) {
       resetForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);


  if (isSubmitted) {
    if (reportedProblem) {
      return (
        <div className="text-center p-6 sm:p-10 bg-background/30 backdrop-blur-md rounded-2xl border border-amber-500/30 shadow-xl overflow-hidden relative">
          <div className="p-4 sm:p-6">
            <AlertTriangle className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-amber-500 animate-pulse mb-4 sm:mb-6" />
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white mb-2">
              PROBLEMA SEGNALATO
            </h2>
            <div className="flex justify-center mb-6">
              <Badge variant="outline" className="text-amber-500 border-amber-500/40 bg-amber-500/10 py-1 px-4 font-bold tracking-widest text-[10px] uppercase">
                Segnalazione Acquisita
              </Badge>
            </div>
            <div className="text-left bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-8">
              <p className="text-sm sm:text-base font-bold text-amber-200 text-center leading-relaxed">
                Il problema è stato segnalato. Si prega di rivolgersi al personale di controllo all'ingresso per completare l'ammissione ed accedere.
              </p>
            </div>
            <Button onClick={resetForm} variant="outline" className="border-amber-500/30 hover:bg-amber-500/10 rounded-full px-8 py-5 h-auto font-bold uppercase text-xs">
              Torna alla Home
            </Button>
          </div>
        </div>
      );
    }

    return (
        <div className="text-center p-4 sm:p-8 bg-background/20 backdrop-blur-md rounded-2xl border border-primary/20 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-progress-indeterminate"></div>
            <div className="p-4 sm:p-8">
                <PartyPopper className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-primary animate-bounce mb-4 sm:mb-6"/>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-white mb-2">{t('submission.success.title')}</h2>
                <div className="flex justify-center mb-6">
                    <Badge variant="outline" className="text-primary border-primary/30 py-1 px-4 font-bold tracking-widest text-[10px] uppercase">Registrazione Inoltrata</Badge>
                </div>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto leading-relaxed text-sm sm:text-base">{t('submission.success.description')}</p>
                
                <Separator className="my-6 opacity-10" />

                <div className="text-left bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5 flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <h5 className="font-black text-xs uppercase tracking-[0.15em] text-primary mb-1.5">{t('submission.success.nextSteps.title')}</h5>
                        <div 
                            className="text-xs sm:text-sm font-medium leading-relaxed text-foreground/90 space-y-1" 
                            dangerouslySetInnerHTML={{ __html: t('submission.success.nextSteps.description') }} 
                        />
                    </div>
                </div>
                
                <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <Button onClick={resetForm} variant="outline" className="border-primary/20 hover:bg-primary/10 rounded-full px-6 sm:px-8 py-5 sm:py-6 h-auto font-bold uppercase text-xs">
                        {t('submission.success.newApplication')}
                    </Button>
                    <Button asChild className="rounded-full px-6 sm:px-8 py-5 sm:py-6 h-auto font-black uppercase text-xs tracking-wider shadow-[0_4px_15px_rgba(var(--primary),0.3)]">
                    {cameFromAdmin ? (
                        <Link href="/admin/elenco"><List className="mr-2 h-4 w-4" /> Torna all'elenco</Link>
                        ) : (
                        <Link href="/"><Home className="mr-2 h-4 w-4" /> {t('submission.success.goHome')}</Link>
                    )}
                    </Button>
                </div>
            </div>
            <div className="absolute -right-20 -bottom-20 opacity-[0.03] text-primary group-hover:scale-110 transition-transform duration-1000 rotate-12 pointer-events-none">
                <PartyPopper size={300}/>
            </div>
        </div>
    )
  }

  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!mounted) return <div className="h-[400px] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <>
        <Alert className="mb-8 border-primary/20 bg-secondary">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold text-primary">{t('fee.title')}</AlertTitle>
          <AlertDescription className="text-foreground/90" dangerouslySetInnerHTML={{ __html: t('fee.description') }} />
        </Alert>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processForm)} className="space-y-8">
            <div className="relative pt-2">
                <Progress value={progress} className="h-1.5 w-full bg-primary/10 overflow-hidden rounded-full" />
                <div className="absolute -top-1 left-0 flex justify-between w-full opacity-0 pointer-events-none">
                    {/* Visual markers for progress */}
                </div>
            </div>
            
            <div key={currentStep} className="animate-in fade-in slide-in-from-right-4 duration-500 pt-2">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                        {(steps[currentStep] as any).icon}
                    </div>
                    <div>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black text-muted-foreground/50 border-none p-0 mb-0.5">
                            Step {currentStep + 1} di {steps.length}
                        </Badge>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">{steps[currentStep].title}</h2>
                    </div>
                </div>

                {steps[currentStep].id === 1 && (
                   <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="male" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {t('steps.gender.male')}
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="female" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {t('steps.gender.female')}
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {steps[currentStep].id === 2 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('steps.name.firstName')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('steps.name.firstNamePlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('steps.name.lastName')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('steps.name.lastNamePlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {steps[currentStep].id === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('steps.birth.date')}</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-center">
                                <Select 
                                    onValueChange={(val) => handleDateChange('day', val, field.value, field.onChange)}
                                    value={field.value ? field.value.split('-')[2] : undefined}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="GG" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select 
                                    onValueChange={(val) => handleDateChange('month', val, field.value, field.onChange)}
                                    value={field.value ? field.value.split('-')[1] : undefined}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Mese" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={m.value}>{toTitleCase(m.label)}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select 
                                    onValueChange={(val) => handleDateChange('year', val, field.value, field.onChange)}
                                    value={field.value ? field.value.split('-')[0] : undefined}
                                >
                                     <SelectTrigger className="w-full col-span-2 sm:col-span-1">
                                        <SelectValue placeholder="Anno" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                          </FormControl>
                          <FormDescription className="text-[10px] text-muted-foreground mt-1">
                            Seleziona giorno, mese e anno di nascita
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthPlace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('steps.birth.place')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('steps.birth.placePlaceholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {steps[currentStep].id === guardianStep.id && (
                    <div className="space-y-4 p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/10 text-left">
                        <p className="text-sm text-yellow-300 font-medium">{t('steps.guardian.description')}</p>
                        <FormField
                            control={form.control}
                            name="guardianFirstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('steps.guardian.firstName')}</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={t('steps.guardian.firstNamePlaceholder')}
                                        disabled={!!guardianSignatureMetadata}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="guardianLastName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('steps.guardian.lastName')}</FormLabel>
                                     <FormControl>
                                      <Input
                                        placeholder={t('steps.guardian.lastNamePlaceholder')}
                                        disabled={!!guardianSignatureMetadata}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="guardianBirthDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('steps.guardian.birthDate')}</FormLabel>
                                    <FormControl>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 items-center">
                                            <Select 
                                                onValueChange={(val) => handleDateChange('day', val, field.value, field.onChange)}
                                                value={field.value ? field.value.split('-')[2] : undefined}
                                                disabled={!!guardianSignatureMetadata}
                                            >
                                               <SelectTrigger className="w-full pointer-events-auto">
                                                 <SelectValue placeholder="GG" />
                                               </SelectTrigger>
                                               <SelectContent>
                                                 {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                               </SelectContent>
                                            </Select>

                                            <Select 
                                                onValueChange={(val) => handleDateChange('month', val, field.value, field.onChange)}
                                                value={field.value ? String((parseDate(field.value)?.getMonth() ?? 0) + 1).padStart(2, '0') : undefined}
                                                disabled={!!guardianSignatureMetadata}
                                            >
                                               <SelectTrigger className="w-full pointer-events-auto">
                                                 <SelectValue placeholder="Mese" />
                                               </SelectTrigger>
                                               <SelectContent>
                                                 {months.map(m => <SelectItem key={m.value} value={m.value}>{toTitleCase(m.label)}</SelectItem>)}
                                               </SelectContent>
                                            </Select>

                                            <Select 
                                                onValueChange={(val) => handleDateChange('year', val, field.value, field.onChange)}
                                                value={field.value ? String(parseDate(field.value)?.getFullYear()) : undefined}
                                                disabled={!!guardianSignatureMetadata}
                                            >
                                               <SelectTrigger className="w-full col-span-2 sm:col-span-1 pointer-events-auto">
                                                 <SelectValue placeholder="Anno" />
                                               </SelectTrigger>
                                               <SelectContent>
                                                 {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                               </SelectContent>
                                            </Select>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="guardianPhone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cellulare Tutore</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="+39 340 1234567"
                                        disabled={!!guardianSignatureMetadata}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription className="text-xs text-muted-foreground">
                                      Inserisci il numero del tutore per ricevere l'SMS di firma del tutore.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Interfaccia OTP Tutore */}
                        <div className="mt-4 pt-4 border-t border-yellow-500/20">
                          {guardianSignatureMetadata ? (
                            <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg flex items-center justify-between">
                              <div className="text-left">
                                <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" /> {guardianSignatureMetadata.method === 'MANUAL_PAPER' ? 'Firma Cartacea Tutore Impostata!' : 'Firma Tutore Apposta!'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {guardianSignatureMetadata.method === 'MANUAL_PAPER' 
                                    ? 'Firma cartacea da archiviare in sede'
                                    : `Firma OTP registrata per il numero: ${guardianSignatureMetadata.signerPhone}`
                                  }
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setGuardianSignatureMetadata(null);
                                  setGuardianOtpSent(false);
                                  setGuardianOtpCode("");
                                }}
                                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-semibold h-8"
                              >
                                Cambia Firma
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-4 text-left">
                              {!guardianOtpSent ? (
                                <div className="space-y-3">
                                  <Button
                                    type="button"
                                    onClick={() => handleSendGuardianOtp()}
                                    disabled={isSendingGuardianOtp || !form.getValues("guardianPhone") || form.getValues("guardianPhone").trim().length < 5 || guardianOtpCooldown > 0}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                                  >
                                    {isSendingGuardianOtp ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : guardianOtpCooldown > 0 ? (
                                      `Attendi (${guardianOtpCooldown}s)`
                                    ) : (
                                      "Invia SMS per Firma Tutore"
                                    )}
                                  </Button>

                                  {cameFromAdmin && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setGuardianSignatureMetadata({
                                          method: 'MANUAL_PAPER',
                                          signedAt: new Date().toISOString(),
                                          notes: 'Firma cartacea del Tutore (inserimento da admin)'
                                        });
                                        toast({
                                          title: "Firma Cartacea Tutore Impostata",
                                          description: "Firma cartacea impostata con successo. Ora puoi procedere."
                                        });
                                      }}
                                      className="w-full border-amber-500 text-amber-500 hover:bg-amber-500/10 font-bold"
                                    >
                                      Procedi con Firma Cartacea (Senza SMS)
                                    </Button>
                                  )}

                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-px bg-border/50" />
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">oppure</span>
                                    <div className="flex-1 h-px bg-border/50" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={nextStep}
                                    className="w-full text-center text-xs text-amber-400/70 hover:text-amber-400 transition-colors underline underline-offset-2 focus:outline-none"
                                  >
                                    Salta firma tutore (il modulo cartaceo sarà necessario in sede)
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3 bg-background/50 p-3 rounded-lg border border-border">
                                  <div className="space-y-1">
                                    <Label htmlFor="guardian-otp-code-input" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                      Codice di Conferma Tutore
                                    </Label>
                                    <Input
                                      id="guardian-otp-code-input"
                                      placeholder="123456"
                                      maxLength={6}
                                      value={guardianOtpCode}
                                      onChange={(e) => setGuardianOtpCode(e.target.value)}
                                      className="text-center text-lg font-mono tracking-widest"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      onClick={handleConfirmGuardianOtp}
                                      disabled={isVerifyingGuardianOtp || !guardianOtpCode}
                                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                      {isVerifyingGuardianOtp && <Loader2 className="w-4 h-4 animate-spin" />}
                                      Conferma e Firma
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      onClick={() => {
                                        setGuardianOtpSent(false);
                                        setGuardianOtpCode("");
                                      }}
                                      disabled={isVerifyingGuardianOtp}
                                    >
                                      Annulla
                                    </Button>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground text-center">
                                    Hai inserito un numero errato? Clicca su Annulla per modificarlo.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                    </div>
                )}

                {steps[currentStep].id === 4 && (
                  <FormField
                      control={form.control}
                      name="fiscalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('steps.fiscalCode.label')}</FormLabel>
                           <FormControl>
                            <Input
                              placeholder="RSSMRA80A01H501U"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>{t('validation.optionalField')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                )}

                {steps[currentStep].id === 5 && (
                  <div className="space-y-4">
                     <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('steps.address.street')}</FormLabel>
                          <FormControl><Input placeholder={t('steps.address.streetPlaceholder')} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-7">
                              <FormLabel>{t('steps.address.city')}</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder={t('steps.address.cityPlaceholder')}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="province"
                          render={({ field }) => (
                            <FormItem  className="sm:col-span-2">
                              <FormLabel>{t('steps.address.province')}</FormLabel>
                               <FormControl>
                                <Input
                                  placeholder="RM"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-3">
                              <FormLabel>{t('steps.address.postalCode')}</FormLabel>
                              <FormControl><Input placeholder="00100" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                     </div>
                  </div>
                )}

                {steps[currentStep].id === 6 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('steps.contact.email')}</FormLabel>
                          <FormControl><Input placeholder={t('steps.contact.emailPlaceholder')} {...field} /></FormControl>
                          <FormDescription>{t('validation.optionalField')}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{isMinor ? "Telefono Genitore / Tutore" : t('steps.contact.phone')}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormDescription>
                            {isMinor 
                              ? "Inserisci il numero del genitore per ricevere l'SMS di firma. Se lo stesso numero è già stato usato per un'altra iscrizione, attendi 2 minuti prima di richiedere il codice." 
                              : t('validation.optionalField')
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="whatsappConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-background data-[disabled=true]:opacity-50" data-disabled={!isPhoneEntered}>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={!isPhoneEntered}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className={!isPhoneEntered ? "text-muted-foreground" : ""}>
                              {t('steps.contact.whatsappLabel')}
                            </FormLabel>
                            <FormDescription>
                              {t('steps.contact.whatsappDescription')}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {steps[currentStep].id === 7 && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="legalConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-6 shadow-md bg-background border-primary/20 hover:border-primary/40 transition-colors">
                          <FormControl>
                            <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange}
                                className="h-5 w-5 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                          </FormControl>
                          <div className="space-y-2 leading-none">
                            <FormLabel className="text-base font-medium text-foreground cursor-pointer">
                                {t('steps.privacy.label').split('[').map((part, i) => {
                                    if (part.includes(']')) {
                                        const [linkText, rest] = part.split(']');
                                        const href = linkText.toLowerCase().includes('statuto') ? '/statuto' : '/privacy';
                                        return (
                                            <span key={i}>
                                                <Link href={href} className="text-primary underline font-bold hover:text-primary/80" target="_blank">
                                                    {linkText}
                                                </Link>
                                                {rest}
                                            </span>
                                        );
                                    }
                                    return part;
                                })}
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" onClick={prevStep} variant="outline" disabled={currentStep === 0 || isSubmitting}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {t('buttons.back')}
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                  {t('buttons.next')} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" className="font-bold" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? t('buttons.submitting') : t('buttons.submit')}
                </Button>
              )}
            </div>
          </form>
        </Form>

        {showOtpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md border border-border bg-background p-6 rounded-2xl shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-left">
              <button 
                type="button"
                onClick={() => setShowOtpModal(false)}
                disabled={isSubmitting}
                className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>

              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Firma Digitalizzata tramite SMS</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Per confermare l'iscrizione e apporre la Firma Elettronica Semplice allo Statuto e alla Privacy, verifica il tuo numero di cellulare.
                </p>
              </div>

              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" /> Numero di cellulare
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={editablePhone}
                      onChange={(e) => setEditablePhone(e.target.value)}
                      disabled={otpSent}
                      placeholder="+39 340 1234567"
                      className="font-semibold"
                    />
                    {!otpSent ? (
                      <Button type="button" size="sm" onClick={() => { setPendingFormValues((v: any) => ({ ...v, phone: editablePhone })); handleSendOtp(editablePhone); }} disabled={isSendingOtp || !editablePhone || otpCooldown > 0}>
                        {isSendingOtp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : otpCooldown > 0 ? (
                          `Attendi (${otpCooldown}s)`
                        ) : (
                          "Invia OTP"
                        )}
                      </Button>
                    ) : (
                      <Button type="button" size="sm" variant="outline" onClick={() => { setOtpSent(false); setOtpCode(""); setConfirmationResult(null); }} disabled={isSubmitting}>
                        Cambia
                      </Button>
                    )}
                  </div>
                  {otpSent && (
                    <p className="text-[11px] text-amber-500">
                      ⚠️ Numero errato? Clicca su <b>Cambia</b> per modificarlo e reinviare l'SMS.
                    </p>
                  )}
                </div>

                {otpSent && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" /> Codice OTP ricevuto via SMS
                    </label>
                    <Input 
                      placeholder="123456" 
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="text-center text-lg font-mono tracking-widest"
                      autoFocus
                    />
                    <div className="flex justify-between items-center pt-1 gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        Inserisci il codice a 6 cifre per completare la firma.
                      </p>
                      <Button 
                        type="button" 
                        variant="link" 
                        size="sm" 
                        onClick={() => handleSendOtp()} 
                        disabled={isSendingOtp || otpCooldown > 0}
                        className="text-xs h-auto p-0 text-primary hover:underline flex items-center gap-1 shrink-0 font-semibold"
                      >
                        {isSendingOtp ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        {otpCooldown > 0 ? `Attendi (${otpCooldown}s)` : "Rinvia SMS"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowOtpModal(false)} disabled={isSubmitting}>
                  Annulla
                </Button>
                <Button 
                  type="button" 
                  onClick={handleConfirmOtp} 
                  disabled={!otpSent || isSubmitting} 
                  className="font-bold gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Conferma e Firma Digitalmente
                </Button>
              </div>

              <div className="pt-2 text-center border-t border-border/40 mt-1">
                <button 
                  type="button" 
                  onClick={() => setShowConfirmProblemModal(true)} 
                  disabled={isSubmitting}
                  className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors underline font-normal focus:outline-none"
                >
                  Se hai problemi con la richiesta clicca qui
                </button>
              </div>
            </div>
          </div>
        )}

        <Dialog open={showConfirmProblemModal} onOpenChange={(open) => { setShowConfirmProblemModal(open); if(!open) setProblemDescription(""); }}>
          <DialogContent className="border border-amber-500/20 shadow-lg bg-background sm:max-w-md" closeText="CHIUDI" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-500 font-bold">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" /> Segnala Problema e Chiedi Aiuto
              </DialogTitle>
              <DialogDescription className="text-foreground/80 leading-relaxed text-sm">
                La tua richiesta verrà registrata <b>senza firma digitale</b>. Sarà necessario recarsi fisicamente in sede per firmare il modulo cartaceo e completare l'ammissione.
                <br /><br />
                Descrivi brevemente il problema riscontrato (es. SMS non ricevuto, numero errato, ecc.):
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Textarea
                placeholder="Scrivi qui il tipo di problema riscontrato..."
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                className="bg-muted/50 border-amber-500/30 focus-visible:ring-amber-500 min-h-[100px] resize-none"
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => { setShowConfirmProblemModal(false); setProblemDescription(""); }} className="rounded-full font-semibold">
                Torna Indietro
              </Button>
              <Button 
                type="button" 
                onClick={async () => {
                  setShowConfirmProblemModal(false);
                  await handleProblemSignal();
                }} 
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-full font-bold"
              >
                Procedi ed Invia
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Container per il Recaptcha di Firebase Auth — visibile su Safari/iOS, fuori schermo altrove */}
        <div
          id="recaptcha-container"
          style={isSafari
            ? { display: 'flex', justifyContent: 'center', padding: '8px 0' }
            : { position: 'absolute', top: '-9999px', left: '-9999px' }
          }
        ></div>
        {/* Container separato per il reCAPTCHA del tutore — visibile su Safari/iOS, fuori schermo altrove */}
        <div
          id="recaptcha-container-guardian"
          style={isSafari
            ? { display: 'flex', justifyContent: 'center', padding: '8px 0' }
            : { position: 'absolute', top: '-9999px', left: '-9999px' }
          }
        ></div>

    </>
  );
}