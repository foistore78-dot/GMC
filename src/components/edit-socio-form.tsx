"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useCallback, useState, useEffect } from "react";
import { differenceInYears } from "date-fns";
import { doc, writeBatch, serverTimestamp, collection } from "firebase/firestore";

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
import { useFirestore } from "@/firebase";
import type { Socio } from "@/lib/soci-data";
import { Textarea } from "./ui/textarea";
import { getFullName, formatDate } from "./soci-table";
import { Separator } from "./ui/separator";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const QUALIFICHE = ["SOCIO FONDATORE", "VOLONTARIO", "MUSICISTA"] as const;

export const isMinorCheck = (birthDate: string | undefined | Date): boolean => {
  if (!birthDate) return false;
  const date = new Date(birthDate);
  if (isNaN(date.getTime())) return false;
  return differenceInYears(new Date(), date) < 18;
};

const getStatus = (socio: Socio): "active" | "pending" | "rejected" => {
    // If it's an active member, status is 'active'
    if (socio.membershipStatus === "active") {
        return "active";
    }
    // For pending requests, the status can be 'pending' or 'rejected'
    if (socio.status === 'rejected') {
        return 'rejected';
    }
    // Default for non-active members is 'pending'
    return "pending";
};


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
    privacyConsent: z.boolean().refine((val) => val === true, { message: "Devi accettare l'informativa." }),
    notes: z.string().optional(),
    membershipYear: z.string().optional(),
    membershipFee: z.coerce.number().optional(),
    qualifica: z.array(z.string()).optional(),
    requestDate: z.string().optional(),
    joinDate: z.string().optional(),
    guardianFirstName: z.string().optional(),
    guardianLastName: z.string().optional(),
    guardianBirthDate: z.string().optional(),
    status: z.enum(["active", "pending", "rejected"]),
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
  onClose: () => void;
};

export function EditSocioForm({ socio, onClose }: EditSocioFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();

  const getDefaultValues = useCallback((s: Socio) => {
    const isMinor = isMinorCheck(s.birthDate);
    return {
      ...s,
      status: getStatus(s),
      birthDate: s.birthDate ? formatDate(s.birthDate, "yyyy-MM-dd") : "",
      guardianBirthDate: s.guardianBirthDate ? formatDate(s.guardianBirthDate, "yyyy-MM-dd") : "",
      requestDate: s.requestDate ? formatDate(s.requestDate, "yyyy-MM-dd") : new Date().toISOString().split("T")[0],
      joinDate: s.joinDate ? formatDate(s.joinDate, "yyyy-MM-dd") : "",
      phone: s.phone || "",
      email: s.email || "",
      qualifica: s.qualifica || [],
      membershipYear: s.membershipYear || new Date().getFullYear().toString(),
      membershipFee: s.membershipFee ?? (isMinor ? 0 : 10),
      notes: s.notes || "",
      guardianFirstName: s.guardianFirstName || "",
      guardianLastName: s.guardianLastName || "",
      privacyConsent: s.privacyConsent ?? true,
      whatsappConsent: s.whatsappConsent ?? false,
      fiscalCode: s.fiscalCode || "",
    };
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(socio),
  });

  const birthDateValue = form.watch("birthDate");
  const isMinor = isMinorCheck(birthDateValue);
  const currentStatus = form.watch("status");


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const originalStatus = getStatus(socio);
    const newStatus = values.status;
    const { status, ...dataToSave } = values;

    const batch = writeBatch(firestore);

    try {
        if (newStatus === 'rejected') {
            if (socio.id) {
                const requestDocRef = doc(firestore, 'membership_requests', socio.id);
                const memberDocRef = doc(firestore, 'members', socio.id);
                batch.delete(requestDocRef);
                batch.delete(memberDocRef);
            }
        } else if (originalStatus !== newStatus) {
            if (newStatus === 'active') { // Moving from 'pending' to 'members'
                const oldDocRef = doc(firestore, 'membership_requests', socio.id);
                const newDocRef = doc(firestore, 'members', socio.id);
                
                const finalData = {
                    ...socio,
                    ...dataToSave,
                    id: socio.id,
                    membershipStatus: 'active' as const,
                    joinDate: values.joinDate ? new Date(values.joinDate).toISOString() : new Date().toISOString(),
                    expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                };
                delete (finalData as any).status;
                
                batch.set(newDocRef, finalData, { merge: true });
                batch.delete(oldDocRef);

            } else if (newStatus === 'pending') { // Moving from 'active' to 'membership_requests'
                const oldDocRef = doc(firestore, 'members', socio.id);
                const newDocRef = doc(firestore, 'membership_requests', socio.id);
                
                const finalData: any = {
                    ...socio,
                    ...dataToSave,
                    id: socio.id,
                    status: 'pending' as const,
                    requestDate: values.requestDate ? new Date(values.requestDate).toISOString() : new Date().toISOString(),
                };
                delete finalData.membershipStatus;
                delete finalData.joinDate;
                delete finalData.expirationDate;

                batch.set(newDocRef, finalData, { merge: true });
                batch.delete(oldDocRef);
            }
        } else {
            const collectionName = newStatus === 'active' ? 'members' : 'membership_requests';
            const docRef = doc(firestore, collectionName, socio.id);
            const finalData = {
              ...dataToSave,
              joinDate: values.joinDate ? new Date(values.joinDate).toISOString() : (socio.joinDate || null),
            };

            batch.set(docRef, finalData, { merge: true });
        }
        
        await batch.commit();

        toast({
            title: newStatus === 'rejected' ? "Richiesta Rifiutata" : "Socio aggiornato!",
            description: `I dati di ${getFullName(values)} sono stati salvati.`,
        });
        
        setIsSubmitting(false);
        onClose();

    } catch (error) {
        console.error("Error updating document:", error);
        toast({
            title: "Errore durante l'aggiornamento",
            description: `Impossibile salvare le modifiche per ${getFullName(values)}. Dettagli: ${(error as Error).message}`,
            variant: "destructive",
        });
        setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    form.reset(getDefaultValues(socio));
  }, [socio, form, getDefaultValues]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-h-[85vh] overflow-y-auto p-1 pr-4 mt-4"
      >
        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Dati Tesseramento</h3>
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
                      className="flex flex-col space-y-2"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="active" />
                        </FormControl>
                        <FormLabel className="font-normal">Attivo</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="pending" />
                        </FormControl>
                        <FormLabel className="font-normal">Sospeso</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="rejected" />
                        </FormControl>
                        <FormLabel className="font-normal">Rifiutato</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Attiva, metti in sospeso o rifiuta la richiesta.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
               <FormField
                control={form.control}
                name="membershipYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anno Associativo</FormLabel>
                    <FormControl><Input {...field} value={field.value || ''}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requestDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Richiesta</FormLabel>
                    <FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {currentStatus === "active" && (
                <FormField
                  control={form.control}
                  name="joinDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Ammissione</FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <FormField
              control={form.control}
              name="qualifica"
              render={() => (
                <FormItem>
                  <div className="mb-4"><FormLabel className="text-base">Qualifiche Socio</FormLabel></div>
                  <div className="space-y-2">
                    {QUALIFICHE.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="qualifica"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Amministrative</FormLabel>
                  <FormControl><Textarea {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
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
                    <FormControl><Input type="date" {...field} /></FormControl>
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
              <>
                <Separator className="my-6" />
                <div className="p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/10 space-y-4">
                  <h3 className="text-md font-semibold text-yellow-300">Dati del Tutore (Socio Minorenne)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="guardianFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Tutore</FormLabel>
                          <FormControl><Input {...field} value={field.value || ''}/></FormControl>
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
                          <FormControl><Input {...field} value={field.value || ''}/></FormControl>
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
                        <FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Dati di Residenza</h3>
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
          </div>
        </div>
        <div>
          <h3 className="text-lg font-medium text-primary mb-2">Contatti</h3>
          <div className="space-y-4 rounded-md border p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} value={field.value || ''} /></FormControl>
                     <FormDescription>Campo opzionale</FormDescription>
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
                     <FormDescription>Campo opzionale</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="whatsappConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Consenso WhatsApp</FormLabel>
                    <FormDescription>Autorizza l&apos;uso del numero per il gruppo WhatsApp.</FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
        <div>
           <h3 className="text-lg font-medium text-primary mb-2">Consenso Privacy</h3>
          <div className="space-y-4 rounded-md border p-4">
            <FormField
              control={form.control}
              name="privacyConsent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                     <Checkbox
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Consenso Privacy</FormLabel>
                    <FormDescription>Il socio ha accettato la privacy policy.</FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>
        <div className="flex justify-end pt-4 sticky bottom-0 bg-secondary/80 backdrop-blur-sm pb-4 rounded-b-lg">
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
