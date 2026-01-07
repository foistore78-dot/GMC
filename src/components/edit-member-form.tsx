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
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { Member } from "@/lib/members-data";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { getStatus, getFullName } from "./members-table";
import { setDocumentNonBlocking } from "@/firebase";

const formSchema = z.object({
  firstName: z.string().min(2, { message: "Il nome deve contenere almeno 2 caratteri." }),
  lastName: z.string().min(2, { message: "Il cognome deve contenere almeno 2 caratteri." }),
  email: z.string().email({ message: "Inserisci un indirizzo email valido." }),
  phone: z.string().min(10, { message: "Inserisci un numero di telefono valido." }),
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
});

type EditMemberFormProps = {
    member: Member;
    onClose: () => void;
    onUpdate: (updatedMember: Member, newStatus: string, originalStatus: string) => void;
};

export function EditMemberForm({ member, onClose, onUpdate }: EditMemberFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const originalStatus = getStatus(member);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...member,
      status: originalStatus,
      membershipYear: member.membershipYear || new Date().getFullYear().toString(),
      membershipFee: member.membershipFee ?? (differenceInYears(new Date(), member.birthDate || new Date()) < 18 ? 0 : 10),
      isVolunteer: member.isVolunteer || false,
      notes: member.notes || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) {
      toast({ title: "Errore di connessione a Firestore", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const newStatus = values.status;
    const { status, ...dataToSave } = values;

    const finalMemberData: Member = {
      ...member,
      ...dataToSave,
      id: member.id,
      membershipStatus: newStatus === 'active' ? 'active' : 'pending', // adjust as per your logic
      // other status related fields need to be handled here
    };


    try {
        if (originalStatus !== newStatus) {
            // Status has changed, we need to move the document
            const batch = writeBatch(firestore);

            // 1. Define old and new document references
            const oldCollection = originalStatus === 'active' ? 'members' : 'membership_requests';
            const oldDocRef = doc(firestore, oldCollection, member.id);

            const newCollection = newStatus === 'active' ? 'members' : 'membership_requests';
            const newDocRef = doc(firestore, newCollection, member.id);

            // 2. Prepare data for the new document
            let finalData: any = {
                ...member, // preserve original fields
                ...dataToSave,
                id: member.id,
            };

            if (newStatus === 'active') {
                finalData.membershipStatus = 'active';
                if (!finalData.joinDate) finalData.joinDate = serverTimestamp();
                if (!finalData.expirationDate) finalData.expirationDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
                delete finalData.status;
            } else {
                finalData.status = newStatus;
                if (!finalData.requestDate) finalData.requestDate = serverTimestamp();
                delete finalData.membershipStatus;
                delete finalData.joinDate;
                delete finalData.expirationDate;
            }

            // 3. Perform batch write: delete old, create new
            batch.delete(oldDocRef);
            batch.set(newDocRef, finalData, { merge: true });
            
            // Non-blocking commit
            batch.commit().then(() => {
                onUpdate(finalMemberData as Member, newStatus, originalStatus);
            }).catch(error => {
                console.error("Error committing batch:", error);
                toast({ title: "Errore", description: "Si è verificato un problema durante l'aggiornamento.", variant: "destructive" });
            });

        } else {
            // Status has not changed, just update the existing document
            const collectionName = newStatus === 'active' ? 'members' : 'membership_requests';
            const docRef = doc(firestore, collectionName, member.id);
            setDocumentNonBlocking(docRef, dataToSave, { merge: true });
            onUpdate(finalMemberData as Member, newStatus, originalStatus);
        }

        toast({
            title: "Membro aggiornato!",
            description: `I dati di ${getFullName(values)} sono stati aggiornati.`,
        });

    } catch (error) {
        console.error("Error updating member:", error);
        toast({
            title: "Errore",
            description: "Si è verificato un problema durante l'aggiornamento.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
}


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
        
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stato</FormLabel>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem><FormLabel>Cognome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Telefono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem><FormLabel>Data di Nascita</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="birthPlace" render={({ field }) => (
                <FormItem><FormLabel>Luogo di Nascita</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="fiscalCode" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Codice Fiscale</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Indirizzo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem><FormLabel>Città</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <div className="flex gap-4">
                <FormField control={form.control} name="province" render={({ field }) => (
                    <FormItem className="w-20"><FormLabel>Prov.</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="postalCode" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>CAP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="membershipYear" render={({ field }) => (
                <FormItem><FormLabel>Anno Associativo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <FormField control={form.control} name="membershipFee" render={({ field }) => (
                <FormItem><FormLabel>Quota Versata (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
             <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>Note</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )}/>
            <div className="md:col-span-2 space-y-4">
                <FormField control={form.control} name="whatsappConsent" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>Consenso WhatsApp</FormLabel><FormDescription>Autorizza l'uso del numero per il gruppo WhatsApp.</FormDescription></div></FormItem>
                )}/>
                <FormField control={form.control} name="isVolunteer" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>Volontario</FormLabel><FormDescription>Il membro è disponibile per attività di volontariato.</FormDescription></div></FormItem>
                )}/>
            </div>
        </div>
        <div className="flex justify-end pt-4">
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
