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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, ArrowLeft, PartyPopper, Info, Home, List, User } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useFirestore, addDocumentNonBlocking, logAdminActivity } from "@/firebase";
import { doc, getDoc, collection, serverTimestamp } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useLanguage } from "./language-provider";
import { normalizeSocioData, parseDate, toTitleCase } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUTO_TEXT } from "@/lib/statuto";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";

export function MembershipForm() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const firestore = useFirestore();
  const [isMinor, setIsMinor] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  }).refine(data => {
      if (!data.birthDate || !mounted) return true;
      const age = differenceInYears(new Date(), new Date(data.birthDate));
      if (age < 18) {
          return !!data.guardianFirstName && !!data.guardianLastName && !!data.guardianBirthDate;
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
    fields: ["guardianFirstName", "guardianLastName", "guardianBirthDate"] as const,
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
  
  async function processForm(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      if (!firestore) {
        throw new Error("Firestore is not initialized");
      }

      const cleanedValues = normalizeSocioData(values);

      const membershipRequestData = {
        ...cleanedValues,
        privacyConsent: values.legalConsent,
        statuteConsent: values.legalConsent,
        requestDate: serverTimestamp(),
        status: 'pending',
      };
      
      const requestsCollection = collection(firestore, 'membership_requests');
      
      // CRITICAL: We don't await the mutation for maximum UI responsiveness
      addDocumentNonBlocking(requestsCollection, membershipRequestData);

      logAdminActivity(firestore, 'new_request', `Arrivata nuova richiesta da parte di ${values.firstName} ${values.lastName}`);

      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: t('submission.error.title'),
        description: t('submission.error.description'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

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
    return (
        <div className="text-center p-8 bg-background/20 backdrop-blur-md rounded-2xl border border-primary/20 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary animate-progress-indeterminate"></div>
            <div className="p-10">
                <PartyPopper className="w-20 h-20 mx-auto text-primary animate-bounce mb-6"/>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">{t('submission.success.title')}</h2>
                <div className="flex justify-center mb-6">
                    <Badge variant="outline" className="text-primary border-primary/30 py-1 px-4 font-bold tracking-widest text-[10px] uppercase">Registrazione Inoltrata</Badge>
                </div>
                <p className="mt-2 text-muted-foreground max-w-md mx-auto leading-relaxed">{t('submission.success.description')}</p>
                
                <Separator className="my-8 opacity-10" />

                <Alert className="text-left bg-primary/5 border-primary/20 rounded-xl">
                    <Info className="h-5 w-5 text-primary mt-1" />
                    <div>
                        <AlertTitle className="font-black text-xs uppercase tracking-[0.2em] text-primary mb-2">{t('submission.success.nextSteps.title')}</AlertTitle>
                        <AlertDescription 
                            className="text-sm font-medium leading-relaxed" 
                            dangerouslySetInnerHTML={{ __html: t('submission.success.nextSteps.description') }} 
                        />
                    </div>
                </Alert>
                
                <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={resetForm} variant="outline" className="border-primary/20 hover:bg-primary/10 rounded-full px-8 py-6 h-auto font-bold uppercase text-xs">
                        {t('submission.success.newApplication')}
                    </Button>
                    <Button asChild className="rounded-full px-8 py-6 h-auto font-black uppercase text-xs tracking-wider shadow-[0_4px_15px_rgba(var(--primary),0.3)]">
                    {cameFromAdmin ? (
                        <Link href="/admin/elenco"><List className="mr-2 h-4 w-4" /> Torna all'elenco</Link>
                        ) : (
                        <Link href="/"><Home className="mr-2 h-4 w-4" /> {t('submission.success.goHome')}</Link>
                    )}
                    </Button>
                </div>
            </div>
            <div className="absolute -right-20 -bottom-20 opacity-[0.03] text-primary group-hover:scale-110 transition-transform duration-1000 rotate-12">
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
                    <div className="space-y-4 p-4 border border-yellow-500/30 rounded-lg bg-yellow-500/10">
                        <p className="text-sm text-yellow-300">{t('steps.guardian.description')}</p>
                        <FormField
                            control={form.control}
                            name="guardianFirstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('steps.guardian.firstName')}</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={t('steps.guardian.firstNamePlaceholder')}
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
                          <FormLabel>{t('steps.contact.phone')}</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                           <FormDescription>{t('validation.optionalField')}</FormDescription>
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
    </>
  );
}