
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
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
import { Loader2, ArrowRight, ArrowLeft, PartyPopper, Info, Home, List } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { useLanguage } from "./language-provider";

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
    privacyConsent: z.boolean().refine((val) => val === true, { message: t('validation.privacyConsentRequired') }),
    guardianFirstName: z.string().optional(),
    guardianLastName: z.string().optional(),
    guardianBirthDate: z.string().optional(),
  }).refine(data => {
      if (!data.birthDate) return true; // Let the specific field validator handle this
      const age = differenceInYears(new Date(), new Date(data.birthDate));
      if (age < 18) {
          return !!data.guardianFirstName && !!data.guardianLastName && !!data.guardianBirthDate;
      }
      return true;
  }, {
      message: t('validation.guardianRequired'),
      path: ["guardianFirstName"],
  }), [t]);

  type FormValues = z.infer<typeof formSchema>;

  const baseSteps = useMemo(() => [
    { id: 1, fields: ["gender"] as const, title: t('steps.gender.title') },
    { id: 2, fields: ["firstName", "lastName"] as const, title: t('steps.name.title') },
    { id: 3, fields: ["birthDate", "birthPlace"] as const, title: t('steps.birth.title') },
    { id: 4, fields: ["fiscalCode"] as const, title: t('steps.fiscalCode.title') },
    { id: 5, fields: ["address", "city", "province", "postalCode"] as const, title: t('steps.address.title') },
    { id: 6, fields: ["email", "phone", "whatsappConsent"] as const, title: t('steps.contact.title') },
    { id: 7, fields: ["privacyConsent"] as const, title: t('steps.privacy.title') },
  ], [t]);

  const guardianStep = useMemo(() => ({
    id: 8,
    fields: ["guardianFirstName", "guardianLastName", "guardianBirthDate"] as const,
    title: t('steps.guardian.title'),
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
      privacyConsent: false,
      guardianFirstName: "",
      guardianLastName: "",
      guardianBirthDate: "",
    },
    mode: "onChange",
  });

  const birthDate = form.watch("birthDate");
  const phoneValue = form.watch("phone");

  const steps = isMinor ? [...baseSteps.slice(0, 3), guardianStep, ...baseSteps.slice(3)] : baseSteps;
  
  async function processForm(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      if (!firestore) {
        throw new Error("Firestore is not initialized");
      }
      const membershipRequestData = {
        ...values,
        requestDate: serverTimestamp(),
        status: 'pending',
      };
      
      const requestsCollection = collection(firestore, 'membership_requests');
      await addDocumentNonBlocking(requestsCollection, membershipRequestData);

      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting application:", error);
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
    const output = await form.trigger(fields as FieldName[], { shouldFocus: true });

    if (!output) return;

    if (steps[currentStep].id === 3) {
      if(birthDate) {
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
  
  // Reset form when language changes
  useEffect(() => {
    if(currentStep > 0) {
       resetForm();
    }
  }, [language]);


  if (isSubmitted) {
    return (
        <div className="text-center p-8 bg-background rounded-lg shadow-lg">
            <PartyPopper className="w-16 h-16 mx-auto text-primary animate-bounce"/>
            <h2 className="text-2xl font-headline mt-4 text-primary">{t('submission.success.title')}</h2>
            <p className="mt-2 text-muted-foreground">{t('submission.success.description')}</p>
            <Alert className="mt-6 text-left bg-secondary border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="font-semibold text-primary">{t('submission.success.nextSteps.title')}</AlertTitle>
              <AlertDescription className="text-foreground/90">
                {t('submission.success.nextSteps.description')}
              </AlertDescription>
            </Alert>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={resetForm} variant="outline">
                    {t('submission.success.newApplication')}
                </Button>
                <Button asChild>
                   {cameFromAdmin ? (
                      <Link href="/admin/elenco"><List className="mr-2 h-4 w-4" /> Torna all'elenco</Link>
                    ) : (
                      <Link href="/"><Home className="mr-2 h-4 w-4" /> {t('submission.success.goHome')}</Link>
                   )}
                </Button>
            </div>
        </div>
    )
  }

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isPhoneEntered = phoneValue && phoneValue.trim().length > 4;

  return (
    <>
        <Alert className="mb-8 border-primary/20 bg-secondary">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="font-semibold text-primary">{t('fee.title')}</AlertTitle>
          <AlertDescription className="text-foreground/90" dangerouslySetInnerHTML={{ __html: t('fee.description') }} />
        </Alert>
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
                                    <FormControl><Input type="date" {...field} /></FormControl>
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
                            <FormLabel>
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
                  <FormField
                    control={form.control}
                    name="privacyConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-background">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>{t('steps.privacy.label')}</FormLabel>
                          <FormDescription>
                            {t('steps.privacy.description.start')}{" "}
                            <Link href="/privacy" className="text-primary underline" target="_blank">
                               {t('steps.privacy.description.link')}
                            </Link>.
                          </FormDescription>
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
