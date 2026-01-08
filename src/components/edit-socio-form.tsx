"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { differenceInYears } from 'date-fns';

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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore } from "@/firebase";
import { doc, writeBatch } from "firebase/firestore";
import type { Socio } from "@/lib/soci-data";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { getStatus, getFullName, isMinor, formatDate } from "./soci-table";
import { Separator } from "./ui/separator";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

const formSchema = z.object({
  firstName: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri." }),
  lastName: z.string().min(2, { message: "Il cognome deve contenere almeno 2 caratteri." }),
  gender: z.enum(["male", "female"], { required_error: "È richiesto il genere." }),
  email: z.string().email({ message: "Inserisci un indirizzo email valido." }),
  phone: z.string().optional(),
  birthPlace: z.string().min(2, { message: "Inserisci un luogo di nascita valido." }),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Inserisci una data di nascita valida." }),
  fiscalCode: z.string().length(16, { message: "Il codice fiscale deve essere di 16 caratteri." }),
  address: z.string().min(5, { message: "Inserisci un indirizzo valido." }),
  city: z.string().min(2, { message: "Inserisci una città valida." }),
  province: z.string().length(2, { message: "La sigla della provincia deve essere di 2 caratteri." }),
  postalCode: z.string().length(5, { message: "Il CAP deve essere di 5 caratteri." }),
  whatsappConsent: z.boolean().default(false),
  isVolunteer: z.boolean().default(false),
  notes: z.string().optional(),
  membershipYear: z.string().optional(),
  membershipFee: z.coerce.number().optional(),
  status: z.enum(['active', 'pending', 'rejected']),
  qualifica: z.enum(["", "SOCIO FONDATORE", "VOLONTARIO", "MUSICISTA"]).optional(),
  requestDate: z.string().optional(),
  guardianFirstName: z.string().optional(),
  guardianLastName: z.string().optional(),
  guardianBirthDate: z.string().optional(),
}).refine(data => {
    const age = differenceInYears(new Date(), new Date(data.birthDate));
    if (age < 18) {
        return !!data.guardianFirstName && !!data.guardianLastName && !!data.guardianBirthDate;
    }
    return true;
}, {
    message: "Per i minorenni, tutti i dati del tutore sono obbligatori.",
    path: ["guardianFirstName"],
});

type EditSocioFormProps = {
    socio: Socio;
    onClose: () => void;
};

const getDefaultValues = (socio: Socio) => {
    const originalStatus = getStatus(socio);
    const defaultMembershipYear = socio.membershipYear || new Date().getFullYear().toString();
    
    // This calculation is now done only once
    const socioIsMinor = isMinor(socio.birthDate);
    const calculatedFee = socio.membershipFee ?? (socioIsMinor ? 0 : 10);
    const defaultMembershipFee = socio.membershipFee ?? calculatedFee;
    
    let requestDateValue;
    try {
        requestDateValue = socio.requestDate ? formatDate(socio.requestDate, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
    } catch {
        requestDateValue = new Date().toISOString().split('T')[0];
    }

    return {
        ...socio,
        phone: socio.phone || '',
        status: originalStatus,
        qualifica: socio.qualifica || "",
        membershipYear: defaultMembershipYear,
        membershipFee: defaultMembershipFee,
        isVolunteer: socio.isVolunteer || false,
        notes: socio.notes || "",
        requestDate: requestDateValue,
        guardianFirstName: socio.guardianFirstName || "",
        guardianLastName: socio.guardianLastName || "",
        guardianBirthDate: socio.guardianBirthDate ? formatDate(socio.guardianBirthDate, 'yyyy-MM-dd') : "",
    };
};

export function EditSocioForm({ socio, onClose }: EditSocioFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  
  const defaultValues = getDefaultValues(socio);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });

  const socioIsMinor = isMinor(socio.birthDate);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({ title: "Errore di connessione a Firestore", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const originalStatus = getStatus(socio);
    const newStatus = values.status;
    const { status, ...dataToSave } = values;
    
    const batch = writeBatch(firestore);

    try {
      if (originalStatus !== newStatus) {
        const oldCollection = originalStatus === 'active' ? 'members' : 'membership_requests';
        const oldDocRef = doc(firestore, oldCollection, socio.id);
        
        if (oldCollection === 'members' || oldCollection === 'membership_requests') {
          batch.delete(oldDocRef);
        }

        if (newStatus !== 'rejected') {
            const newCollection = newStatus === 'active' ? 'members' : 'membership_requests';
            const newDocRef = doc(firestore, newCollection, socio.id);
            let finalData: any = { ...socio, ...dataToSave, id: socio.id };

            if (newStatus === 'active') {
                finalData.membershipStatus = 'active';
                finalData.joinDate = socio.joinDate || new Date().toISOString();
                finalData.expirationDate = socio.expirationDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
                delete finalData.status;
            } else { // pending
                finalData.status = newStatus;
                finalData.requestDate = values.requestDate ? new Date(values.requestDate).toISOString() : new Date().toISOString();
                delete finalData.membershipStatus;
                delete finalData.joinDate;
                delete finalData.expirationDate;
            }
            batch.set(newDocRef, finalData, { merge: true });
        }
      } else if (newStatus !== 'rejected') {
        const collection = newStatus === 'active' ? 'members' : 'membership_requests';
        const docRef = doc(firestore, collection, socio.id);
        let dataWithCorrectDate = {
            ...dataToSave,
            birthDate: new Date(values.birthDate).toISOString(),
            requestDate: values.requestDate ? new Date(values.requestDate).toISOString() : socio.requestDate,
            guardianBirthDate: values.guardianBirthDate ? new Date(values.guardianBirthDate).toISOString() : socio.guardianBirthDate
        };
        batch.set(docRef, dataWithCorrectDate, { merge: true });
      }

      await batch.commit();

      toast({
          title: "Socio aggiornato!",
          description: `I dati di ${getFullName(values)} sono stati salvati.`,
      });
      
      onClose();

    } catch(error) {
        console.error("Error committing batch:", error);
        toast({ 
          title: "Errore durante l'aggiornamento", 
          description: `Impossibile salvare le modifiche per ${getFullName(values)}. Dettagli: ${(error as Error).message}`, 
          variant: "destructive" 
        });
    } finally {
        setIsSubmitting(false);
    }
}


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[85vh] overflow-y-auto p-1 pr-4 mt-4">
        
        {/* --- DATI TESSERAMENTO --- */}
        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Dati Tesseramento</h3>
          <div className="space-y-4 rounded-md border p-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato (Logica App)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona uno stato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Attivo</SelectItem>
                      <SelectItem value="pending">In attesa</SelectItem>
                      <SelectItem value="rejected">Rifiutato</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="qualifica"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualifica Socio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nessuna" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Nessuna</SelectItem>
                      <SelectItem value="SOCIO FONDATORE">Socio Fondatore</SelectItem>
                      <SelectItem value="VOLONTARIO">Volontario</SelectItem>
                      <SelectItem value="MUSICISTA">Musicista</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField control={form.control} name="membershipYear" render={({ field }) => (
                  <FormItem><FormLabel>Anno Associativo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="requestDate" render={({ field }) => (
                  <FormItem><FormLabel>Data Richiesta</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="membershipFee" render={({ field }) => (
                  <FormItem><FormLabel>Quota Versata (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Note Amministrative</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
          </div>
        </div>
        
        {/* --- DATI ANAGRAFICI --- */}
        <div>
            <h3 className="text-lg font-medium text-primary mb-2">Dati Anagrafici</h3>
            <div className="space-y-4 rounded-md border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Cognome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Genere</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                          >
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="birthDate" render={({ field }) => (
                        <FormItem><FormLabel>Data di Nascita</FormLabel><FormControl><Input type="date" {...field} value={formatDate(field.value, 'yyyy-MM-dd')} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="birthPlace" render={({ field }) => (
                        <FormItem><FormLabel>Luogo di Nascita</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="fiscalCode" render={({ field }) => (
                    <FormItem><FormLabel>Codice Fiscale</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                {socioIsMinor && (
                  <>
                    <Separator className="my-6" />
                    <div className="p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/10 space-y-4">
                        <h3 className="text-md font-semibold text-yellow-300">Dati del Tutore (Socio Minorenne)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="guardianFirstName" render={({ field }) => (
                                <FormItem><FormLabel>Nome Tutore</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="guardianLastName" render={({ field }) => (
                                <FormItem><FormLabel>Cognome Tutore</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="guardianBirthDate" render={({ field }) => (
                            <FormItem><FormLabel>Data di Nascita Tutore</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                  </>
                )}
            </div>
        </div>

        {/* --- DATI RESIDENZA --- */}
        <div>
            <h3 className="text-lg font-medium text-primary mb-2">Dati di Residenza</h3>
            <div className="space-y-4 rounded-md border p-4">
                 <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>Indirizzo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                 <div className="grid grid-cols-12 gap-4">
                     <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem className="col-span-12 sm:col-span-7"><FormLabel>Città</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="province" render={({ field }) => (
                        <FormItem className="col-span-6 sm:col-span-2"><FormLabel>Prov.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="postalCode" render={({ field }) => (
                        <FormItem className="col-span-6 sm:col-span-3"><FormLabel>CAP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
            </div>
        </div>
        
        {/* --- CONTATTI --- */}
        <div>
            <h3 className="text-lg font-medium text-primary mb-2">Contatti</h3>
            <div className="space-y-4 rounded-md border p-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem><FormLabel>Telefono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                 <FormField control={form.control} name="whatsappConsent" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>Consenso WhatsApp</FormLabel><FormDescription>Autorizza l'uso del numero per il gruppo WhatsApp.</FormDescription></div></FormItem>
                )}/>
            </div>
        </div>

        {/* --- ALTRE IMPOSTAZIONI --- */}
        <div>
            <h3 className="text-lg font-medium text-primary mb-2">Altre Impostazioni</h3>
             <div className="space-y-4 rounded-md border p-4">
                <FormField control={form.control} name="isVolunteer" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>Volontario</FormLabel><FormDescription>Il socio è disponibile per attività di volontariato.</FormDescription></div></FormItem>
                )}/>
            </div>
        </div>

        <div className="flex justify-end pt-4 sticky bottom-0 bg-background pb-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Annulla</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salva Modifiche
          </Button>
        </div>
      </form>
    </Form>
  );
}

    