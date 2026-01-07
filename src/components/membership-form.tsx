"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";

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
import { Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  gender: z.enum(["male", "female"], {
    required_error: "Devi selezionare un sesso.",
  }),
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
  instruments: z.string().min(2, { message: "Elenca almeno uno strumento." }),
  isNotRobot: z.boolean().refine((val) => val === true, { message: "Per favore, conferma di non essere un robot." }),
});

type FormValues = z.infer<typeof formSchema>;

const steps = [
  { id: 1, fields: ["gender"] as const, title: "Sesso" },
  { id: 2, fields: ["firstName", "lastName"] as const, title: "Come ti chiami?" },
  { id: 3, fields: ["birthDate", "birthPlace"] as const, title: "Quando e dove sei nato/a?" },
  { id: 4, fields: ["fiscalCode"] as const, title: "Codice Fiscale" },
  { id: 5, fields: ["address", "city", "province", "postalCode"] as const, title: "Indirizzo di Residenza" },
  { id: 6, fields: ["email", "phone"] as const, title: "Come possiamo contattarti?" },
  { id: 7, fields: ["instruments"] as const, title: "Parlaci del tuo talento" },
  { id: 8, fields: ["isNotRobot"] as const, title: "Ultimo controllo" },
];

export function MembershipForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const firestore = useFirestore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gender: undefined,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      birthPlace: "",
      birthDate: "",
      fiscalCode: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      instruments: "",
      isNotRobot: false,
    },
  });

  async function processForm(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      const { isNotRobot, ...rest } = values;
      const membershipRequestData = {
        ...rest,
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
      setCurrentStep(0);
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

  type FieldName = keyof FormValues;

  const nextStep = async () => {
    const fields = steps[currentStep].fields;
    const output = await form.trigger(fields as FieldName[], { shouldFocus: true });

    if (!output) return;

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

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(processForm)} className="space-y-8">
        <Progress value={progress} className="w-full" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold mb-6 text-foreground">{steps[currentStep].title}</h2>

            {currentStep === 0 && (
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
                            Maschio
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="female" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Femmina
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl><Input placeholder="Mario" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="Rossi" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                 <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
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
                      <FormControl><Input placeholder="Roma" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            {currentStep === 3 && (
              <FormField
                  control={form.control}
                  name="fiscalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Fiscale</FormLabel>
                      <FormControl><Input placeholder="RSSMRA80A01H501U" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                 <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl><Input placeholder="Via Roma, 1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Città</FormLabel>
                          <FormControl><Input placeholder="Roma" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CAP</FormLabel>
                          <FormControl><Input placeholder="00100" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
                 <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Provincia (sigla)</FormLabel>
                          <FormControl><Input placeholder="RM" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo Email</FormLabel>
                      <FormControl><Input placeholder="tu@esempio.com" {...field} /></FormControl>
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
                      <FormControl><Input placeholder="+39 333 1234567" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {currentStep === 6 && (
              <FormField
                control={form.control}
                name="instruments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quali strumenti suoni?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="es. Chitarra, Basso, Batteria, Voce..." {...field} />
                    </FormControl>
                    <FormDescription>Elenca i tuoi talenti musicali.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {currentStep === 7 && (
              <FormField
                control={form.control}
                name="isNotRobot"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-background">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Non sono un robot</FormLabel>
                      <FormDescription>Un semplice CAPTCHA per prevenire lo spam.</FormDescription>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between pt-4">
          <Button type="button" onClick={prevStep} variant="outline" disabled={currentStep === 0 || isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button type="button" onClick={nextStep} disabled={isSubmitting}>
              Avanti <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" className="font-bold" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Invio in corso..." : "Invia Candidatura"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
