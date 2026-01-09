
"use client";

import { useState, useEffect } from "react";
import type { Socio } from "@/lib/soci-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Printer, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { QUALIFICHE, isMinorCheck as isMinor } from "./edit-socio-form";
import { getFullName } from "./soci-table";

const formatCurrency = (value: number | undefined | null) => {
    const number = value ?? 0;
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(number);
}

interface RenewSocioDialogProps {
  socio: Socio;
  allMembers: Socio[];
  onSocioRenewed: (socio: Socio) => void;
  onPrint: (socio: Socio) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenewSocioDialog({
  socio,
  allMembers,
  onSocioRenewed,
  onPrint,
  open,
  onOpenChange
}: RenewSocioDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isRenewing, setIsRenewing] = useState(false);
  const [newRenewalMemberNumber, setNewRenewalMemberNumber] = useState("");
  const [renewalFee, setRenewalFee] = useState(10);
  const [renewalQualifiche, setRenewalQualifiche] = useState<string[]>([]);
  const [renewalFeePaid, setRenewalFeePaid] = useState(false);
  const [renewedSocioData, setRenewedSocioData] = useState<Socio | null>(null);

  useEffect(() => {
    if (open) {
      // Reset state every time the dialog opens
      setIsRenewing(false);
      setRenewedSocioData(null);
      setRenewalFeePaid(false);
      setRenewalQualifiche(socio.qualifica || []);
      setRenewalFee(isMinor(socio.birthDate) ? 0 : 10);
      
      const currentYear = new Date().getFullYear();
      const yearMemberNumbers = allMembers
        .filter(m => m.membershipYear === String(currentYear) && m.tessera)
        .map(m => parseInt(m.tessera!.split('-')[2], 10))
        .filter(n => !isNaN(n));

      let nextNumber = 1;
      const sortedNumbers = yearMemberNumbers.sort((a, b) => a - b);
      for (const num of sortedNumbers) {
        if (num === nextNumber) {
          nextNumber++;
        } else {
          break;
        }
      }
      setNewRenewalMemberNumber(String(nextNumber));
    }
  }, [open, socio, allMembers]);

  const handleRenewalQualificaChange = (qualifica: string, checked: boolean) => {
    setRenewalQualifiche(prev =>
      checked ? [...prev, qualifica] : prev.filter(q => q !== qualifica)
    );
  };
  
  const handleDialogClose = () => {
    onOpenChange(false);
  }

  const handleRenew = async () => {
    if (!firestore || isRenewing || !renewalFeePaid) return;
    setIsRenewing(true);

    const currentYear = new Date().getFullYear();
    const newTessera = `GMC-${currentYear}-${newRenewalMemberNumber}`;
    const today = new Date();
    const renewalNote = `Rinnovato per l'anno ${currentYear}. Tessera precedente: ${socio.tessera} (${socio.membershipYear}). Quota versata: ${formatCurrency(renewalFee)}.`;
    const updatedNotes = socio.notes ? `${socio.notes}\n\n${renewalNote}` : renewalNote;

    const memberDocRef = doc(firestore, "members", socio.id);

    const newRenewedData = {
      membershipYear: String(currentYear),
      tessera: newTessera,
      membershipFee: renewalFee,
      qualifica: renewalQualifiche,
      expirationDate: new Date(currentYear, 11, 31).toISOString(),
      renewalDate: today.toISOString(),
      notes: updatedNotes,
    };

    try {
      await updateDoc(memberDocRef, newRenewedData);
      
      const finalSocioData = { ...socio, ...newRenewedData };
      setRenewedSocioData(finalSocioData);

      toast({
        title: "Rinnovo Effettuato!",
        description: `${getFullName(socio)} è stato rinnovato per l'anno ${currentYear}. Nuova tessera: ${newTessera}`,
      });
      
      // Notify parent about the update
      onSocioRenewed(finalSocioData);

    } catch (error) {
      console.error("Error renewing member:", error);
      toast({
        title: "Errore di Rinnovo",
        description: `Impossibile rinnovare ${getFullName(socio)}. Dettagli: ${(error as Error).message}`,
        variant: "destructive",
      });
      setIsRenewing(false);
    } 
    // Do not set isRenewing to false here, so the loader stays until the user closes the success screen
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {renewedSocioData ? (
          <>
            <DialogHeader>
              <DialogTitle>Rinnovo Completato!</DialogTitle>
              <DialogDescription>
                L'iscrizione di <strong className="text-foreground">{getFullName(renewedSocioData)}</strong> è stata rinnovata per l'anno in corso.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-sm">Nuovo numero tessera:</p>
              <p className="font-bold text-lg text-primary">{renewedSocioData.tessera}</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleDialogClose}>Chiudi</Button>
              <Button onClick={() => { onPrint(renewedSocioData); handleDialogClose(); }}>
                <Printer className="mr-2 h-4 w-4" /> Stampa Scheda
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rinnova Iscrizione Socio</DialogTitle>
              <DialogDescription>
                Stai per rinnovare l'iscrizione di <strong className="text-foreground">{getFullName(socio)}</strong> per l'anno in corso.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="renewal-membership-number" className="sm:text-right">
                  N. Tessera
                </Label>
                <div className="col-span-3">
                  <Input
                    id="renewal-membership-number"
                    value={`GMC-${new Date().getFullYear()}-${newRenewalMemberNumber}`}
                    onChange={(e) => {
                      const parts = e.target.value.split('-');
                      setNewRenewalMemberNumber(parts[parts.length - 1] || '');
                    }}
                    className="w-40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
                <Label className="sm:text-right pt-2">Qualifiche</Label>
                <div className="col-span-3 space-y-2">
                  {QUALIFICHE.map((q) => (
                    <div key={q} className="flex items-center space-x-2">
                      <Checkbox
                        id={`renewal-qualifica-${q}`}
                        checked={renewalQualifiche.includes(q)}
                        onCheckedChange={(checked) => handleRenewalQualificaChange(q, !!checked)}
                      />
                      <label htmlFor={`renewal-qualifica-${q}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {q}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                <Label htmlFor="renewal-fee" className="sm:text-right">
                  Quota Rinnovo (€)
                </Label>
                <div className="col-span-3 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Input
                    id="renewal-fee"
                    type="number"
                    value={renewalFee}
                    onChange={(e) => setRenewalFee(Number(e.target.value))}
                    className="w-28"
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox id="renewal-fee-paid" checked={renewalFeePaid} onCheckedChange={(checked) => setRenewalFeePaid(!!checked)} />
                    <Label htmlFor="renewal-fee-paid" className="text-sm font-medium">Quota Versata</Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={handleDialogClose}>Annulla</Button>
              <Button onClick={handleRenew} disabled={isRenewing || !renewalFeePaid}>
                {isRenewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Conferma Rinnovo
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
