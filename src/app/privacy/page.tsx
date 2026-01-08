import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto bg-background p-8 md:p-12 rounded-lg border border-border shadow-lg">
          <h1 className="font-headline text-3xl md:text-4xl text-primary mb-6">
            Informativa sul Trattamento dei Dati Personali
          </h1>
          <p className="text-muted-foreground mb-8 italic">
            ai sensi dell’art. 13 del Regolamento (UE) 2016/679
          </p>

          <div className="space-y-6 text-foreground/90">
            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                1. Titolare del trattamento
              </h2>
              <p>
                L'Associazione di Promozione Sociale "Garage Music Club," con
                sede in Gorizia, Via del Carso 10, C.F. 91090330311 (di
                seguito, "Titolare"), in qualità di titolare del trattamento, ti
                informa ai sensi dell'art. 13 Regolamento UE n. 2016/679 (in
                seguito, "GDPR") che i tuoi dati saranno trattati con le
                modalità e per le finalità seguenti.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                2. Oggetto del Trattamento
              </h2>
              <p>
                Il Titolare tratta i dati personali, identificativi (ad
                esempio, nome, cognome, indirizzo, telefono, e-mail) – in
                seguito, "dati personali" o anche "dati" – da te comunicati in
                fase di richiesta di ammissione e tesseramento all'associazione.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                3. Finalità del trattamento
              </h2>
              <p>
                I tuoi dati personali sono trattati, senza il tuo consenso
                espresso (art. 6 lett. b, e GDPR), per le seguenti Finalità di
                Servizio:
              </p>
              <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                <li>
                  Gestire la richiesta di ammissione e il tesseramento;
                </li>
                <li>
                  Adempiere agli obblighi precontrattuali, contrattuali e
                  fiscali derivanti da rapporti con te in essere;
                </li>
                <li>
                  Adempiere agli obblighi previsti dalla legge, da un
                  regolamento, dalla normativa comunitaria o da un ordine
                  dell’Autorità;
                </li>
                <li>
                  Esercitare i diritti del Titolare, ad esempio il diritto di
                  difesa in giudizio.
                </li>
              </ul>
              <p className="mt-4">
                Inoltre, solo previo tuo specifico e distinto consenso (art. 7
                GDPR), per le seguenti Altre Finalità:
              </p>
              <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                <li>
                  Inviarti via e-mail, posta e/o sms e/o contatti telefonici,
                  newsletter, comunicazioni commerciali e/o materiale
                  pubblicitario su eventi, iniziative e attività
                  dell'associazione.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                4. Modalità di trattamento e periodo di conservazione dei dati
              </h2>
              <p>
                Il trattamento dei tuoi dati personali è realizzato per mezzo
                delle operazioni indicate all’art. 4 n. 2) GDPR e precisamente:
                raccolta, registrazione, organizzazione, conservazione,
                consultazione, elaborazione, modificazione, selezione,
                estrazione, raffronto, utilizzo, interconnessione, blocco,
                comunicazione, cancellazione e distruzione dei dati. I tuoi dati
                personali sono sottoposti a trattamento sia cartaceo che
                elettronico e/o automatizzato.
              </p>
              <p className="mt-2">
                Il Titolare tratterà i dati personali per il tempo necessario
                per adempiere alle finalità di cui sopra e comunque per non
                oltre 10 anni dalla cessazione del rapporto associativo e per
                non oltre 2 anni dalla raccolta dei dati per le Altre Finalità.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                5. Accesso ai dati
              </h2>
              <p>
                I tuoi dati potranno essere resi accessibili per le finalità di
                cui all’art. 3:
              </p>
              <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                <li>
                  A membri del consiglio direttivo o incaricati del Titolare,
                  nella loro qualità di incaricati e/o responsabili interni del
                  trattamento;
                </li>
                <li>
                  A società terze o altri soggetti (a titolo indicativo,
                  istituti di credito, studi professionali, consulenti, ecc.)
                  che svolgono attività in outsourcing per conto del Titolare,
                  nella loro qualità di responsabili esterni del trattamento.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                6. Comunicazione dei dati
              </h2>
              <p>
                Senza la necessità di un espresso consenso (ex art. 6 lett. b) e
                c) GDPR), il Titolare potrà comunicare i tuoi dati per le
                finalità di cui all’art. 3 a Organismi di vigilanza, Autorità
                giudiziarie, nonché a quei soggetti ai quali la comunicazione
                sia obbligatoria per legge per l’espletamento delle finalità
                dette. Detti soggetti tratteranno i dati nella loro qualità di
                autonomi titolari del trattamento. I tuoi dati non saranno
                diffusi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                7. Natura del conferimento dei dati e conseguenze del rifiuto
                di rispondere
              </h2>
              <p>
                Il conferimento dei dati per le Finalità di Servizio di cui
                all’art. 3 è obbligatorio. In loro assenza, non potremo
                garantirti l'ammissione e il tesseramento all'associazione. Il
                conferimento dei dati per le Altre Finalità è invece
                facoltativo. Puoi quindi decidere di non conferire alcun dato o
                di negare successivamente la possibilità di trattare dati già
                forniti: in tal caso, non potrai ricevere newsletter,
                comunicazioni commerciali e materiale pubblicitario inerenti
                alle attività dell'associazione.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                8. Diritti dell’interessato
              </h2>
              <p>
                Nella tua qualità di interessato, hai i diritti di cui all’art.
                15 GDPR e precisamente i diritti di:
              </p>
              <ol className="list-decimal list-inside pl-4 mt-2 space-y-1">
                <li>
                  Ottenere la conferma dell'esistenza o meno di dati personali
                  che ti riguardano;
                </li>
                <li>
                  Ottenere l’indicazione: a) dell’origine dei dati personali; b)
                  delle finalità e modalità del trattamento; c) della logica
                  applicata in caso di trattamento effettuato con l’ausilio di
                  strumenti elettronici; d) degli estremi identificativi del
                  titolare, dei responsabili e del rappresentante designato;
                </li>
                <li>
                  Ottenere: a) l’aggiornamento, la rettificazione ovvero, quando
                  vi hai interesse, l’integrazione dei dati; b) la
                  cancellazione, la trasformazione in forma anonima o il blocco
                  dei dati trattati in violazione di legge;
                </li>
                <li>
                  Opporti, in tutto o in parte: a) per motivi legittimi al
                  trattamento dei dati personali che ti riguardano, ancorché
                  pertinenti allo scopo della raccolta; b) al trattamento di
                  dati personali che ti riguardano a fini di invio di materiale
                  pubblicitario o di vendita diretta o per il compimento di
                  ricerche di mercato o di comunicazione commerciale.
                </li>
              </ol>
              <p className="mt-2">
                Ove applicabili, hai altresì i diritti di cui agli artt. 16-21
                GDPR (Diritto di rettifica, diritto all’oblio, diritto di
                limitazione di trattamento, diritto alla portabilità dei dati,
                diritto di opposizione), nonché il diritto di reclamo
                all’Autorità Garante.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-primary mb-3">
                9. Modalità di esercizio dei diritti
              </h2>
              <p>
                Potrai in qualsiasi momento esercitare i tuoi diritti inviando
                una comunicazione a mezzo raccomandata A.R. a: Associazione di
                Promozione Sociale "Garage Music Club", Via del Carso 10, 34170
                Gorizia (GO), oppure una e-mail all’indirizzo:
                garage.music.club2024@gmail.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
