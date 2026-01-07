"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Il nome deve contenere almeno 2 caratteri.",
  }),
  email: z.string().email({
    message: "Inserisci un indirizzo email valido.",
  }),
  phone: z.string().min(10, {
    message: "Inserisci un numero di telefono valido.",
  }),
  instruments: z.string().min(2, {
    message: "Elenca almeno uno strumento.",
  }),
  isNotRobot: z.boolean().refine((val) => val === true, {
    message: "Per favore, conferma di non essere un robot.",
  }),
});

export function MembershipForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      instruments: "",
      isNotRobot: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      const { name, ...rest } = values;
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const membershipRequestData = {
        ...rest,
        firstName,
        lastName,
        requestDate: serverTimestamp(),
        status: 'pending',
      };
      
      const requestsCollection = collection(firestore, 'membership_requests');
      await addDocumentNonBlocking(requestsCollection, membershipRequestData);

      toast({
        title: "Domanda Inviata!",
        description: "Grazie per il tuo interesse. Ti contatteremo presto.",
      });
      form.reset();
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un problema durante l'invio della domanda.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome e Cognome</FormLabel>
              <FormControl>
                <Input placeholder="Mario Rossi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indirizzo Email</FormLabel>
              <FormControl>
                <Input placeholder="tu@esempio.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numero di Telefono</FormLabel>
              <FormControl>
                <Input placeholder="(123) 456-7890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="instruments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quali strumenti suoni?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="es. Chitarra, Basso, Batteria, Voce..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Parlaci dei tuoi talenti musicali.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isNotRobot"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-background">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Non sono un robot
                </FormLabel>
                <FormDescription>
                    Un semplice CAPTCHA per prevenire lo spam.
                </FormDescription>
                 <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full text-lg font-bold py-6" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Invio in corso..." : "Invia Candidatura"}
        </Button>
      </form>
    </Form>
  );
}
