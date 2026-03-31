"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  User, 
  CreditCard, 
  Settings, 
  Trash2, 
  Save, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck,
  Loader2,
  Trash
} from "lucide-react";
import { doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { QUALIFICHE } from "@/lib/soci-data";
import type { Socio } from "@/lib/soci-data";
import { 
  parseDate, 
  formatDate, 
  getFullName, 
  toTitleCase 
} from "@/lib/utils";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirestore } from "@/firebase";

const formSchema = z.object({
  firstName: z.string().min(2, "Nome non valido"),
  lastName: z.string().min(2, "Cognome non valido"),
  birthDate: z.any().optional(),
  birthPlace: z.string().optional(),
  fiscalCode: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().length(2, "Provincia non valida (2 lettere)").optional().or(z.literal("")),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  membershipYear: z.string().optional(),
  tessera: z.string().optional(),
  requestDate: z.any().optional(),
  joinDate: z.any().optional(),
  renewalDate: z.any().optional(),
  expirationDate: z.any().optional(),
  qualifica: z.array(z.string()).optional(),
  membershipFee: z.number().optional(),
  notes: z.string().optional(),
  isMinor: z.boolean().optional(),
  whatsappConsent: z.boolean().optional().default(false),
  privacyConsent: z.boolean().optional().default(true),
  guardianFirstName: z.string().optional(),
  guardianLastName: z.string().optional(),
  guardianFiscalCode: z.string().optional(),
});

interface EditSocioFormProps {
  socio: Socio;
  onClose: (updatedSocio?: Socio) => void;
  isFromMembersCollection?: boolean;
  onNewApproval?: (socio: Socio) => void;
}

export default function EditSocioForm({ socio, onClose, isFromMembersCollection = true, onNewApproval }: EditSocioFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...socio,
      birthDate: formatDate(socio.birthDate, 'yyyy-MM-dd'),
      joinDate: formatDate(socio.joinDate, 'yyyy-MM-dd'),
      renewalDate: formatDate(socio.renewalDate, 'yyyy-MM-dd'),
      requestDate: formatDate(socio.requestDate, 'yyyy-MM-dd'),
      expirationDate: formatDate(socio.expirationDate, 'yyyy-MM-dd'),
      membershipYear: socio.membershipYear || String(new Date().getFullYear()),
      qualifica: socio.qualifica || [],
      email: socio.email || "",
      province: socio.province?.toUpperCase() || "",
      whatsappConsent: socio.whatsappConsent || false,
      privacyConsent: socio.privacyConsent ?? true,
    },
  });

  const isMinor = form.watch("isMinor");

  // Helper arrays for date selects

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSubmitting(true);
    try {
      const collectionName = isFromMembersCollection ? "members" : "membership_requests";
      const docRef = doc(firestore, collectionName, socio.id);
      
      const updateData: any = {
        ...values,
        updatedAt: serverTimestamp(),
      };
      
      // Preserve original date object/timestamp to avoid breaking queries
      // Only attach if it exists, otherwise fallback or remove to avoid undefined errors
      if (socio.requestDate !== undefined) {
        updateData.requestDate = socio.requestDate;
      } else if (values.requestDate === undefined) {
        delete updateData.requestDate;
      }

      // Final safety check: remove any undefined values before sending to Firestore
      const safeUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );

      await updateDoc(docRef, safeUpdateData);
      
      toast({
        title: "Socio Aggiornato",
        description: "I dati sono stati salvati correttamente.",
      });
      onClose({ ...socio, ...updateData } as Socio);
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare i dati.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!firestore) return;
    setIsDeleting(true);
    try {
      const collectionName = isFromMembersCollection ? "members" : "membership_requests";
      await deleteDoc(doc(firestore, collectionName, socio.id));
      toast({
        title: "Socio Eliminato",
        description: "Il profilo è stato rimosso definitivamente.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il socio.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header Informativo */}
      <div className="bg-secondary/30 p-6 border-b">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold font-headline uppercase text-primary">
                {form.watch("lastName")} {form.watch("firstName")}
              </h2>
              <Badge variant={socio.status === 'active' ? 'default' : 'secondary'} className="uppercase px-3 py-1 text-[10px] font-bold tracking-widest border-2">
                {socio.status === 'active' ? 'ATTIVO' : 
                 socio.status === 'expired' ? 'SCADUTO' : 
                 socio.status === 'rejected' ? 'RESPINTO' : 
                 (isFromMembersCollection ? 'ATTIVO' : 'IN ATTESA')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2">
              {socio.tessera && (
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/30">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold font-mono tracking-tight text-foreground">
                    Tessera: <span className="text-primary text-base ml-1">{socio.tessera}</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col overflow-hidden">
            <div className="px-2 sm:px-6 border-b bg-card">
              <TabsList className="w-full justify-start bg-transparent h-auto sm:h-12 gap-2 sm:gap-6 rounded-none p-0 overflow-x-auto flex-nowrap custom-scrollbar pb-1 sm:pb-0">
                <TabsTrigger value="personal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 sm:h-full px-2 gap-1 sm:gap-2 font-medium whitespace-nowrap text-xs sm:text-sm">
                  <User className="h-4 w-4 shrink-0" /> Anagrafica
                </TabsTrigger>
                <TabsTrigger value="membership" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 sm:h-full px-2 gap-1 sm:gap-2 font-medium whitespace-nowrap text-xs sm:text-sm">
                  <CreditCard className="h-4 w-4 shrink-0" /> Tesseramento
                </TabsTrigger>
                <TabsTrigger value="admin" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-10 sm:h-full px-2 gap-1 sm:gap-2 font-medium whitespace-nowrap text-xs sm:text-sm">
                  <Settings className="h-4 w-4 shrink-0" /> Amministrazione
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
              <TabsContent value="personal" className="mt-0 space-y-6 animate-in slide-in-from-left-2 duration-300">
                <Card className="border-none shadow-none bg-transparent">
                  <CardContent className="p-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl><Input {...field} className="bg-muted/50"/></FormControl>
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
                          <FormControl><Input {...field} className="bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Data di Nascita</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ""} 
                              className="bg-muted/50 block w-full"
                              onChange={(e) => {
                                field.onChange(e.target.value);
                              }}
                            />
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
                          <FormControl><Input {...field} className="bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Genere</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex gap-6 pt-2"
                            >
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="male" className="h-5 w-5 border-primary text-primary" />
                                </FormControl>
                                <FormLabel className="font-bold cursor-pointer text-base">
                                  M
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="female" className="h-5 w-5 border-primary text-primary" />
                                </FormControl>
                                <FormLabel className="font-bold cursor-pointer text-base">
                                  F
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fiscalCode"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Codice Fiscale</FormLabel>
                          <FormControl><Input {...field} className="uppercase bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="space-y-4 pt-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <MapPin className="h-4 w-4" /> Residenza
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Indirizzo</FormLabel>
                          <FormControl><Input {...field} className="bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Città</FormLabel>
                          <FormControl><Input {...field} className="bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prov</FormLabel>
                          <FormControl><Input {...field} maxLength={2} className="uppercase bg-muted/50"/></FormControl>
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
                          <FormControl><Input {...field} className="bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    <Phone className="h-4 w-4" /> Contatti
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefono</FormLabel>
                          <FormControl><Input {...field} type="tel" className="bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input {...field} type="email" className="bg-muted/50"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-2">
                    <FormField
                      control={form.control}
                      name="whatsappConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-xl border bg-primary/5">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium cursor-pointer">
                              Consenso comunicazioni WhatsApp
                            </FormLabel>
                            <p className="text-[10px] text-muted-foreground">
                              Il socio accetta di ricevere comunicazioni ed avvisi tramite WhatsApp
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {isMinor && (
                   <div className="space-y-4 pt-4 p-4 border rounded-xl bg-primary/5">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider">
                      <ShieldCheck className="h-4 w-4" /> Dati Tutore Legale
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="guardianFirstName"
                        render={({ field }) => (
                          <FormItem><FormLabel>Nome Tutore</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="guardianLastName"
                        render={({ field }) => (
                          <FormItem><FormLabel>Cognome Tutore</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="membership" className="mt-0 space-y-6 animate-in slide-in-from-left-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="membershipYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anno Associativo</FormLabel>
                        <FormControl><Input {...field} type="number" className="bg-muted/50"/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tessera"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Numero Tessera</FormLabel>
                        <FormControl><Input {...field} className="bg-muted/50"/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <FormField
                    control={form.control}
                    name="joinDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Iscrizione</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                            className="bg-muted/50 block w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="renewalDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Ultimo Rinnovo</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                            className="bg-muted/50 block w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <FormField
                    control={form.control}
                    name="requestDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Richiesta</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                            className="bg-muted/50 block w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Scadenza Tessera</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ""} 
                            className="bg-muted/50 block w-full"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4">
                  <FormLabel className="text-base font-bold text-primary uppercase">Qualifiche del Socio</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {QUALIFICHE.map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="qualifica"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 rounded-lg border bg-muted/30 hover:bg-primary/5 transition-colors cursor-pointer">
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
                            <FormLabel className="font-medium cursor-pointer flex-grow">{item}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="membershipFee"
                  render={({ field }) => (
                    <FormItem className="pt-4">
                      <FormLabel>Quota Associativa Versata (€)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                          <Input type="number" step="0.01" {...field} className="pl-8 bg-muted/50" value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="admin" className="mt-0 space-y-6 animate-in slide-in-from-left-2 duration-300">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note ed Annotazioni Speciali</FormLabel>
                      <FormControl><Textarea {...field} value={field.value || ""} placeholder="Inserisci note amministrative, allergie, preferenze..." className="min-h-[200px] bg-muted/50 resize-none"/></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Card className="border-destructive/20 bg-destructive/5">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-bold text-destructive uppercase">Zona Pericolosa</CardTitle>
                    <CardDescription className="text-xs">Queste azioni sono permanenti e non possono essere annullate.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full sm:w-auto mt-2 gap-2">
                          <Trash className="h-4 w-4" /> Elimina Profilo Socio
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sei sicuro di voler eliminare questo socio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tutti i record relativi a <strong>{getFullName(socio)}</strong> verranno rimossi definitivamente dal database.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete()} disabled={isDeleting} className={buttonVariants({ variant: "destructive" })}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            {isDeleting ? "Eliminazione..." : "Conferma Eliminazione"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <div className="bg-card border-t p-6 flex justify-between items-center bg-secondary/10">
            <Button variant="ghost" type="button" onClick={() => onClose()} disabled={isSubmitting || isDeleting}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting || isDeleting} className="gap-2 px-8 min-w-[150px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
