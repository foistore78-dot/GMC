
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, useCallback, useMemo } from "react";
import { doc, writeBatch, deleteField } from "firebase/firestore";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { useFirestore, deleteDocumentNonBlocking, errorEmitter, FirestorePermissionError } from "@/firebase";
import type { Socio } from "@/lib/soci-data";
import { QUALIFICHE } from "@/lib/soci-data";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { normalizeSocioData, getFullName, formatDate, getStatus as getSocioStatus, isMinorCheck, toTitleCase, parseDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z
  .object({
    firstName: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri." }),
    lastName: z.string().min(2, { message: "Il cognome deve contenere almeno 2 caratteri." }),
    gender: z.enum(["male", "female"], { required_error: "È richiesto il genere." }),
    email: z.string().email({ message: "Inserisci un indirizzo email valido." }).optional().or(z.literal('')),
    phone: z.string().optional(),
    birthPlace: z.string().min(2, { message: "Inserisci un luogo di nascita valido." }),
    birthDate: z.string().refine((date) => date && !isNaN(Date.parse(date)), { message: "Inserisci una data di nascita valida." }),
    fiscalCode: z.string().optional(),
    address: z.string().min(5, { message: "Inserisci un indirizzo valido." }),
    city: z.string().min(2, { message: "Inserisci una città valida." }),
    province: z.string().length(2, { message: "La sigla della provincia deve essere di 2 caratteri." }),
    postalCode: z.string().length(5, { message: "Il CAP deve essere di 5 caratteri." }),
    whatsappConsent: z.boolean().default(false),
    notes: z.string().optional(),
    membershipYear: z.string().optional(),
    tessera: z.string().optional(),
    membershipFee: z.coerce.number().optional(),
    qualifica: z.array(z.string()).optional(),
    requestDate: z.string().optional(),
    joinDate: z.string().optional(),
    renewalDate: z.string().optional(),
    guardianFirstName: z.string().optional(),
    guardianLastName: z.string().optional(),
    guardianBirthDate: z.string().optional(),
    status: z.enum(["active", "pending", "rejected", "expired"]),
  })
  .refine(
    (data) => {
      if (isMinorCheck(data.birthDate)) {
        return !!data.guardianFirstName && !!data.guardianLastName && !!data.guardianBirthDate;
      }
      return true;
    },
    {
      message: "Per i minorenni, tutti i dati del tutore sono obbligatori.",
      path: ["guardianFirstName"],
    }
  );

type EditSocioFormProps = {
  socio: Socio;
  onClose: (updatedTab?: 'active' | 'requests' | 'expired' | 'rejected') => void;
  isFromMembersCollection?: boolean;
  onNewApproval?: (socio: Socio) => void;
};

export function EditSocioForm({ socio, onClose, isFromMembersCollection = true, onNewApproval }: EditSocioFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const firestore = useFirestore();

  const getDefaultValues = useCallback((s: Socio) => {
    const isMinor = isMinorCheck(s.birthDate);
    const initialStatus = getSocioStatus(s, isFromMembersCollection);
    const formStatus = initialStatus;
    
    // Robust mapping with fallbacks for alternative field names
    return {
      firstName: s.firstName || (s as any).nome || (s as any).Nome || "",
      lastName: s.lastName || (s as any).cognome || (s as any).Cognome || "",
      gender: (s.gender as "male" | "female") || "male",
      status: formStatus as "active" | "pending" | "rejected" | "expired",
      birthDate: s.birthDate ? formatDate(s.birthDate, "yyyy-MM-dd") : "",
      birthPlace: s.birthPlace || (s as any).luogoNascita || "",
      fiscalCode: s.fiscalCode || (s as any).codiceFiscale || "",
      address: s.address || (s as any).indirizzo || "",
      city: s.city || (s as any).citta || "",
      province: s.province || (s as any).prov || "",
      postalCode: s.postalCode || (s as any).cap || "",
      guardianBirthDate: s.guardianBirthDate ? formatDate(s.guardianBirthDate, "yyyy-MM-dd") : "",
      requestDate: s.requestDate ? formatDate(s.requestDate, "yyyy-MM-dd") : (formStatus === 'pending' ? new Date().toISOString().split("T")[0] : ''),
      joinDate: s.joinDate ? formatDate(s.joinDate, "yyyy-MM-dd") : "",
      renewalDate: s.renewalDate ? formatDate(s.renewalDate, "yyyy-MM-dd") : "",
      phone: s.phone || (s as any).cellulare || "",
      email: s.email || "",
      qualifica: s.qualifica || [],
      membershipYear: s.membershipYear || new Date().getFullYear().toString(),
      membershipFee: s.membershipFee ?? (isMinor ? 0 : 10),
      notes: s.notes || "",
      guardianFirstName: s.guardianFirstName || "",
      guardianLastName: s.guardianLastName || "",
      whatsappConsent: s.whatsappConsent ?? false,
      tessera: s.tessera || "",
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(socio),
  });

  const birthDateValue = form.watch("birthDate");
  const isMinor = isMinorCheck(birthDateValue);
  const currentStatus = form.watch("status");
  const phoneValue = form.watch("phone");

  // Helpers per i selettori di data separati
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(new Date(2021, i))
    }));
  }, []);

  const days = useMemo(() => {
     return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  }, []);

  const handleDateChange = (type: 'day' | 'month' | 'year', value: string, currentVal: any, onChange: (val: string) => void) => {
    const date = parseDate(currentVal) || new Date(2000, 0, 1);
    let y = date.getFullYear();
    let m = date.getMonth();
    let d = date.getDate();

    if (type === 'year') y = parseInt(value, 10);
    if (type === 'month') m = parseInt(value, 10) - 1;
    if (type === 'day') d = parseInt(value, 10);

    const newDateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    onChange(newDateStr);
  };

  const isPhoneEntered = useMemo(() => {
    return phoneValue && phoneValue.trim().length > 4;
  }, [phoneValue]);

  useEffect(() => {
    if (!isPhoneEntered && form.getValues("whatsappConsent")) {
      form.setValue("whatsappConsent", false);
    }
  }, [isPhoneEntered, form]);

  // Sync form when socio prop changes
  useEffect(() => {
    if (socio) {
      form.reset(getDefaultValues(socio));
    }
  }, [socio, form, getDefaultValues]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const originalStatus = getSocioStatus(socio, isFromMembersCollection);
    const newStatus = values.status;
    const normalizedValues = normalizeSocioData(values);
    const { status, ...dataToSave } = normalizedValues;

    const batch = writeBatch(firestore);
    let finalTab: 'active' | 'requests' | 'expired' | 'rejected' | undefined;

    if (newStatus === 'rejected') {
        if (socio.id) {
            const dateStr = new Date().toLocaleString('it-IT');
            const oldStatus = getSocioStatus(socio);
            const historyEntry = `--- STORICO ELIMINAZIONE (RESPINTO DA MODIFICA) ${dateStr} ---\nMotivo: Stato cambiato manualmente in Rifiutato\nStato precedente: ${oldStatus}\n------------------------`;
            const newNotes = `${historyEntry}\n\n${socio.notes || ''}`.trim();

            const memberDocRef = doc(firestore, 'members', socio.id);
            const requestDocRef = doc(firestore, 'membership_requests', socio.id);
            
            // Move to members as rejected
            batch.set(memberDocRef, { ...socio, ...dataToSave, status: 'rejected', notes: newNotes }, { merge: true });
            // Remove from requests if it was there
            batch.delete(requestDocRef);
        }
        finalTab = 'rejected';
    } else if (originalStatus !== newStatus && !(originalStatus === 'expired' && newStatus === 'active') && !(originalStatus === 'active' && newStatus === 'expired')) {
        if (newStatus === 'active') {
            const oldDocRef = doc(firestore, 'membership_requests', socio.id);
            const newDocRef = doc(firestore, 'members', socio.id);
            const finalData: any = {
                ...socio,
                ...dataToSave,
                id: socio.id,
                status: 'active' as const,
                joinDate: values.joinDate ? new Date(values.joinDate).toISOString() : new Date().toISOString(),
                expirationDate: new Date(parseInt(values.membershipYear || new Date().getFullYear().toString(), 10), 11, 31).toISOString(),
            };
            batch.set(newDocRef, finalData, { merge: true });
            batch.delete(oldDocRef);
            finalTab = 'active';
        } else if (newStatus === 'pending') {
            const oldDocRef = doc(firestore, 'members', socio.id);
            const newDocRef = doc(firestore, 'membership_requests', socio.id);
            const finalData: any = {
                ...socio,
                ...dataToSave,
                id: socio.id,
                status: 'pending' as const,
                requestDate: socio.requestDate || new Date().toISOString(),
            };
            finalData.tessera = deleteField();
            finalData.membershipFee = deleteField();
            finalData.renewalDate = deleteField();
            finalData.joinDate = deleteField();
            finalData.expirationDate = deleteField();
            batch.set(newDocRef, finalData, { merge: true });
            batch.delete(oldDocRef);
            finalTab = 'requests';
        }
    } else {
        // Se lo stato è active o expired, usiamo la collezione members
        const collectionName = (newStatus === 'active' || newStatus === 'expired') ? 'members' : 'membership_requests';
        const docRef = doc(firestore, collectionName, socio.id);
        const expirationYear = values.membershipYear ? parseInt(values.membershipYear, 10) : new Date().getFullYear();
        const finalData: any = {
          ...dataToSave,
          joinDate: values.joinDate ? new Date(values.joinDate).toISOString() : (socio.joinDate || null),
          renewalDate: values.renewalDate ? new Date(values.renewalDate).toISOString() : (socio.renewalDate || null),
          expirationDate: new Date(expirationYear, 11, 31).toISOString(),
          privacyConsent: socio.privacyConsent,
        };
        if (collectionName === 'membership_requests') {
            finalData.tessera = deleteField();
            finalData.membershipFee = 0;
            finalTab = 'requests';
        } else {
          finalData.tessera = values.tessera;
          finalData.status = newStatus; // Esplicitamente impostiamo lo stato scelto nel form
          finalTab = newStatus === 'expired' ? 'expired' : 'active';
        }
        batch.set(docRef, finalData, { merge: true });
    }
    
    batch.commit().then(() => {
        toast({
            title: newStatus === 'rejected' ? "Richiesta Rifiutata" : "Socio aggiornato!",
            description: `I dati di ${getFullName(normalizedValues)} sono stati salvati correttamente.`,
        });
        
        // If it was a pending request and now it's active, it's an approval!
        if (originalStatus === 'pending' && newStatus === 'active' && onNewApproval) {
            // Use the data that was just saved
            onNewApproval({ ...socio, ...dataToSave, status: 'active', id: socio.id } as Socio);
        }

        setIsSubmitting(false);
        onClose(finalTab);
    }).catch(async (error) => {
        setIsSubmitting(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `members/${socio.id}`,
            operation: 'write',
            requestResourceData: normalizedValues,
        }));
    });
  };
  
  const handleDelete = async () => {
      if (!firestore) return;
      
      const reason = window.prompt("Inserisci il motivo della rimozione (obbligatorio):");
      if (!reason || !reason.trim()) {
          toast({
              title: "Operazione annullata",
              description: "Il motivo della rimozione è obbligatorio.",
              variant: "destructive"
          });
          return;
      }

      setIsDeleting(true);
      
      try {
          const batch = writeBatch(firestore);
          const dateStr = new Date().toLocaleString('it-IT');
          const originalStatus = getSocioStatus(socio, isFromMembersCollection);
          
          const historyEntry = `--- STORICO ELIMINAZIONE (RESPINTO DA MODIFICA - ELIMINA) ${dateStr} ---\nMotivo: ${reason}\nStato precedente: ${originalStatus}\n------------------------`;
          const newNotes = `${historyEntry}\n\n${socio.notes || ''}`.trim();

          const memberDocRef = doc(firestore, 'members', socio.id);
          const requestDocRef = doc(firestore, 'membership_requests', socio.id);
          
          // Move to members as rejected
          batch.set(memberDocRef, { ...socio, status: 'rejected', notes: newNotes }, { merge: true });
          // Remove from requests if it was there
          batch.delete(requestDocRef);

          await batch.commit();

          toast({
              title: "Socio Respinto",
              description: `${getFullName(socio)} è stato spostato nella lista dei respinti.`,
          });
          onClose('rejected');
      } catch (error: any) {
          toast({
              title: "Errore",
              description: `Impossibile completare l'operazione: ${error.message}`,
              variant: "destructive"
          });
      } finally {
          setIsDeleting(false);
      }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-h-[85vh] overflow-y-auto p-1 pr-4 mt-4"
      >
        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Dati Anagrafici</h3>
          <div className="space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cognome</FormLabel>
                     <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Genere</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="male" /></FormControl>
                        <FormLabel className="font-normal">Maschio</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="female" /></FormControl>
                        <FormLabel className="font-normal">Femmina</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <FormField
                 control={form.control}
                 name="birthDate"
                 render={({ field }) => (
                   <FormItem className="flex flex-col">
                     <FormLabel>Data di Nascita</FormLabel>
                     <FormControl>
                        <div className="flex gap-2 items-center">
                            <Select 
                                onValueChange={(val) => handleDateChange('day', val, field.value, field.onChange)}
                                value={field.value ? String(parseDate(field.value)?.getDate()).padStart(2, '0') : undefined}
                            >
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="GG" />
                                </SelectTrigger>
                                <SelectContent>
                                    {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select 
                                onValueChange={(val) => handleDateChange('month', val, field.value, field.onChange)}
                                value={field.value ? String(parseDate(field.value)!.getMonth() + 1).padStart(2, '0') : undefined}
                            >
                                <SelectTrigger className="flex-grow min-w-[110px]">
                                    <SelectValue placeholder="Mese" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{toTitleCase(m.label)}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select 
                                onValueChange={(val) => handleDateChange('year', val, field.value, field.onChange)}
                                value={field.value ? String(parseDate(field.value)?.getFullYear()) : undefined}
                            >
                                <SelectTrigger className="w-[90px]">
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
                name="birthPlace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Luogo di Nascita</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="fiscalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice Fiscale</FormLabel>
                   <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                   <FormDescription>Campo opzionale</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isMinor && (
              <div className="p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/10 space-y-4 mt-4">
                <h3 className="text-md font-semibold text-yellow-300">Dati del Tutore (Minorenne)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="guardianFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Tutore</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="guardianLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome Tutore</FormLabel>
                         <FormControl><Input {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="guardianBirthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data di Nascita Tutore</FormLabel>
                      <FormControl>
                        <div className="flex gap-2 items-center">
                            <Select 
                                onValueChange={(val) => handleDateChange('day', val, field.value, field.onChange)}
                                value={field.value ? String(parseDate(field.value)?.getDate()).padStart(2, '0') : undefined}
                            >
                                <SelectTrigger className="w-[70px]">
                                    <SelectValue placeholder="GG" />
                                </SelectTrigger>
                                <SelectContent>
                                    {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select 
                                onValueChange={(val) => handleDateChange('month', val, field.value, field.onChange)}
                                value={field.value ? String(parseDate(field.value)!.getMonth() + 1).padStart(2, '0') : undefined}
                            >
                                <SelectTrigger className="flex-grow min-w-[110px]">
                                    <SelectValue placeholder="Mese" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{toTitleCase(m.label)}</SelectItem>)}
                                </SelectContent>
                            </Select>

                            <Select 
                                onValueChange={(val) => handleDateChange('year', val, field.value, field.onChange)}
                                value={field.value ? String(parseDate(field.value)?.getFullYear()) : undefined}
                            >
                                <SelectTrigger className="w-[90px]">
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
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Residenza e Contatti</h3>
          <div className="space-y-4 rounded-md border p-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-12 gap-4">
               <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="col-span-12 sm:col-span-7">
                    <FormLabel>Città</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem className="col-span-6 sm:col-span-2">
                    <FormLabel>Prov.</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem className="col-span-6 sm:col-span-3">
                    <FormLabel>CAP</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="whatsappConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 data-[disabled=true]:opacity-50" data-disabled={!isPhoneEntered}>
                  <FormControl>
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={!isPhoneEntered}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className={!isPhoneEntered ? "text-muted-foreground" : ""}>Consenso WhatsApp</FormLabel>
                    <FormDescription>Autorizza l&apos;uso del numero per il gruppo WhatsApp.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Tesseramento</h3>
          <div className="space-y-4 rounded-md border p-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Stato</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex items-center space-x-2 sm:space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="active" /></FormControl>
                        <FormLabel className="font-normal">Attivo</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="expired" /></FormControl>
                        <FormLabel className="font-normal">Sospeso</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="pending" /></FormControl>
                        <FormLabel className="font-normal">In Richiesta</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="rejected" /></FormControl>
                        <FormLabel className="font-normal">Respinto</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="grid grid-cols-2 gap-4 col-span-1">
                   <FormField
                    control={form.control}
                    name="membershipYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anno Ass.</FormLabel>
                        <FormControl><Input {...field} value={field.value || ''}/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   {currentStatus === "active" && (
                    <FormField
                      control={form.control}
                      name="tessera"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N. Tessera</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''}/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                   )}
                </div>

                <FormField
                    control={form.control}
                    name="requestDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Richiesta</FormLabel>
                        <FormControl>
                          <div className="flex gap-2 items-center">
                              <Select 
                                  onValueChange={(val) => handleDateChange('day', val, field.value, field.onChange)}
                                  value={field.value ? String(parseDate(field.value)?.getDate()).padStart(2, '0') : undefined}
                              >
                                  <SelectTrigger className="w-[70px]">
                                      <SelectValue placeholder="GG" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                  </SelectContent>
                              </Select>

                              <Select 
                                  onValueChange={(val) => handleDateChange('month', val, field.value, field.onChange)}
                                  value={field.value ? String(parseDate(field.value)!.getMonth() + 1).padStart(2, '0') : undefined}
                              >
                                  <SelectTrigger className="flex-grow min-w-[110px]">
                                      <SelectValue placeholder="Mese" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      {months.map(m => <SelectItem key={m.value} value={m.value}>{toTitleCase(m.label)}</SelectItem>)}
                                  </SelectContent>
                              </Select>

                              <Select 
                                  onValueChange={(val) => handleDateChange('year', val, field.value, field.onChange)}
                                  value={field.value ? String(parseDate(field.value)?.getFullYear()) : undefined}
                              >
                                  <SelectTrigger className="w-[90px]">
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
            </div>         {currentStatus === "active" && (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <FormField
                      control={form.control}
                      name="joinDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data Ammissione</FormLabel>
                          <FormControl>
                            <div className="flex gap-2 items-center">
                                <Select 
                                    onValueChange={(val) => handleDateChange('day', val, field.value, field.onChange)}
                                    value={field.value ? String(parseDate(field.value)?.getDate()).padStart(2, '0') : undefined}
                                >
                                    <SelectTrigger className="w-[70px]">
                                        <SelectValue placeholder="GG" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select 
                                    onValueChange={(val) => handleDateChange('month', val, field.value, field.onChange)}
                                    value={field.value ? String(parseDate(field.value)!.getMonth() + 1).padStart(2, '0') : undefined}
                                >
                                    <SelectTrigger className="flex-grow min-w-[110px]">
                                        <SelectValue placeholder="Mese" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={m.value}>{toTitleCase(m.label)}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select 
                                    onValueChange={(val) => handleDateChange('year', val, field.value, field.onChange)}
                                    value={field.value ? String(parseDate(field.value)?.getFullYear()) : undefined}
                                >
                                    <SelectTrigger className="w-[90px]">
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
                      name="renewalDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data Rinnovo</FormLabel>
                          <FormControl>
                            <div className="flex gap-2 items-center">
                                <Select 
                                    onValueChange={(val) => handleDateChange('day', val, field.value, field.onChange)}
                                    value={field.value ? String(parseDate(field.value)?.getDate()).padStart(2, '0') : undefined}
                                >
                                    <SelectTrigger className="w-[70px]">
                                        <SelectValue placeholder="GG" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select 
                                    onValueChange={(val) => handleDateChange('month', val, field.value, field.onChange)}
                                    value={field.value ? String(parseDate(field.value)!.getMonth() + 1).padStart(2, '0') : undefined}
                                >
                                    <SelectTrigger className="flex-grow min-w-[110px]">
                                        <SelectValue placeholder="Mese" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={m.value}>{toTitleCase(m.label)}</SelectItem>)}
                                    </SelectContent>
                                </Select>

                                <Select 
                                    onValueChange={(val) => handleDateChange('year', val, field.value, field.onChange)}
                                    value={field.value ? String(parseDate(field.value)?.getFullYear()) : undefined}
                                >
                                    <SelectTrigger className="w-[90px]">
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
                </div>
                </>
              )}

            <FormField
              control={form.control}
              name="qualifica"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base">Qualifiche Socio</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2">
                    {QUALIFICHE.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="qualifica"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item) ?? false}
                                onCheckedChange={(checked) => {
                                  const value = field.value || [];
                                  if (checked) {
                                    field.onChange([...value, item]);
                                  } else {
                                    field.onChange(value.filter((v) => v !== item));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{item}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="membershipFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quota Versata (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val === '' ? undefined : Number(val));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Note Amministrative</h3>
          <div className="rounded-md border p-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ''} placeholder="Aggiungi note..."/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 sticky bottom-0 bg-secondary/90 backdrop-blur-sm pb-4 rounded-b-lg">
          <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={isSubmitting || isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Elimina Socio
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Questa azione non può essere annullata. Questo eliminerà permanentemente il socio <strong className="text-foreground">{getFullName(socio)}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete()} 
                      disabled={isDeleting} 
                      className={buttonVariants({ variant: "destructive" })}
                    >
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isDeleting ? 'Eliminazione...' : 'Conferma Eliminazione'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onClose()} disabled={isSubmitting || isDeleting}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva Modifiche
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
