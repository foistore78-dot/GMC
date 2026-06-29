"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import AuthGuard from "../elenco/AuthGuard";
import { LoadingScreen } from "@/components/loading-screen";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import type { Socio } from "@/lib/soci-data";
import { getFullName, formatDate, parseDate, getSignatureMetadata, getStatus, normalizeSocioData } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar as CalendarIcon, Users, UserCheck, ShieldCheck, TrendingUp, BarChart3, FileText, Smartphone, Inbox } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function DashboardClient() {
  const router = useRouter();
  const { firestore, auth, user, isUserLoading, areServicesAvailable } = useFirebase();
  const [rawMembers, setRawMembers] = useState<Socio[]>([]);
  const [rawRequests, setRawRequests] = useState<Socio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  // View Mode: 'approvals' (Soci Effettivi) vs 'requests' (Domande Inoltrate)
  const [dashboardMode, setDashboardMode] = useState<'approvals' | 'requests'>('approvals');

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }
    
    setIsCheckingAdmin(true);

    const adminEmail = "garage.music.club2024@gmail.com";
    const emailMatch = user.email?.toLowerCase() === adminEmail.toLowerCase();
    
    if (emailMatch) {
      setIsAdmin(true);
      setIsCheckingAdmin(false);
      return;
    }

    if (firestore) {
      try {
        const adminRef = doc(firestore, "roles_admin", user.uid);
        const adminSnap = await getDoc(adminRef);
        setIsAdmin(adminSnap.exists());
      } catch (e) {
        setIsAdmin(false);
      }
    } else {
      setIsAdmin(false);
    }
    setIsCheckingAdmin(false);
  }, [user, firestore]);

  useEffect(() => {
    if (!isUserLoading) checkAdminStatus();
  }, [user, isUserLoading, checkAdminStatus]);

  const handleLogout = useCallback(() => {
    if (auth) {
      signOut(auth).then(() => {
        router.push('/');
      });
      setIsAdmin(false);
    }
  }, [auth, router]);

  // Date selections
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
  const [selectedDay, setSelectedDay] = useState<string | null>(String(currentDate.getDate()).padStart(2, '0'));

  useEffect(() => {
    if (!areServicesAvailable || !firestore) return;

    setIsLoading(true);
    const membersRef = collection(firestore, "members");
    const requestsRef = collection(firestore, "membership_requests");

    const unsubscribeMembers = onSnapshot(
      query(membersRef, orderBy("lastName")),
      (snapshot) => {
        const list: Socio[] = [];
        snapshot.forEach((doc) => {
          list.push(normalizeSocioData({ id: doc.id, ...doc.data() }) as Socio);
        });
        setRawMembers(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("Errore caricamento soci:", err);
        setIsLoading(false);
      }
    );

    const unsubscribeRequests = onSnapshot(
      query(requestsRef, orderBy("requestDate", "desc")),
      (snapshot) => {
        const list: Socio[] = [];
        snapshot.forEach((doc) => {
          list.push(normalizeSocioData({ id: doc.id, ...doc.data() }) as Socio);
        });
        setRawRequests(list);
      },
      (err) => console.error("Errore caricamento richieste:", err)
    );

    return () => {
      unsubscribeMembers();
      unsubscribeRequests();
    };
  }, [firestore, areServicesAvailable]);

  // Filter valid items depending on mode
  // For approvals: MUST be active/expired (NOT rejected), MUST have joinDate and tessera!
  const validItems = useMemo(() => {
    if (dashboardMode === 'approvals') {
      return rawMembers.filter((m) => {
        if (!m.joinDate || !m.tessera) return false;
        if (m.status === 'rejected') return false;
        const status = getStatus(m, true);
        return status === 'active' || status === 'expired';
      });
    } else {
      // For requests: pending requests in membership_requests
      return rawRequests.filter((r) => getStatus(r, false) === 'pending');
    }
  }, [dashboardMode, rawMembers, rawRequests]);

  // Available Years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>([String(currentDate.getFullYear())]);
    validItems.forEach((item) => {
      const dateStr = dashboardMode === 'approvals' ? (item.joinDate || item.submittedAt) : (item.requestDate || item.submittedAt);
      const d = parseDate(dateStr);
      if (d) yearsSet.add(String(d.getFullYear()));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [validItems, currentDate, dashboardMode]);

  // Compute stats for selected month & year
  const monthStats = useMemo(() => {
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10) - 1; // 0-indexed

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dailyCounts: Record<number, { day: number; formattedDate: string; count: number; smsCount: number; paperCount: number; items: Socio[] }> = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const formattedDate = `${String(i).padStart(2, '0')}/${selectedMonth}/${selectedYear}`;
      dailyCounts[i] = { day: i, formattedDate, count: 0, smsCount: 0, paperCount: 0, items: [] };
    }

    let totalMonthCount = 0;
    let totalSmsMonth = 0;
    let totalPaperMonth = 0;
    let todayCount = 0;

    const todayStr = formatDate(new Date(), 'yyyy-MM-dd');

    validItems.forEach((item) => {
      const dateStr = dashboardMode === 'approvals' ? (item.joinDate || item.submittedAt) : (item.requestDate || item.submittedAt);
      const dateObj = parseDate(dateStr);
      if (!dateObj) return;

      const mYear = dateObj.getFullYear();
      const mMonth = dateObj.getMonth();
      const mDay = dateObj.getDate();

      const itemDateStr = formatDate(dateObj, 'yyyy-MM-dd');
      if (itemDateStr === todayStr) {
        todayCount++;
      }

      if (mYear === year && mMonth === month) {
        totalMonthCount++;
        const sig = getSignatureMetadata(item);
        if (sig.method === 'SMS_OTP') {
          totalSmsMonth++;
        } else {
          totalPaperMonth++;
        }

        if (dailyCounts[mDay]) {
          dailyCounts[mDay].count++;
          if (sig.method === 'SMS_OTP') dailyCounts[mDay].smsCount++;
          else dailyCounts[mDay].paperCount++;
          dailyCounts[mDay].items.push(item);
        }
      }
    });

    const chartData = Object.values(dailyCounts).map((d) => ({
      dayLabel: `${d.day}`,
      fullDate: d.formattedDate,
      Totale: d.count,
      "SMS OTP": d.smsCount,
      "Cartaceo / Diretto": d.paperCount,
      rawDay: String(d.day).padStart(2, '0')
    }));

    const avgDaily = (totalMonthCount / daysInMonth).toFixed(1);

    return {
      daysInMonth,
      totalMonthCount,
      totalSmsMonth,
      totalPaperMonth,
      todayCount,
      avgDaily,
      chartData,
      dailyCounts
    };
  }, [validItems, selectedYear, selectedMonth, dashboardMode]);

  // Selected Day Items List
  const selectedDayItems = useMemo(() => {
    if (!selectedDay) return [];
    const dayNum = parseInt(selectedDay, 10);
    return monthStats.dailyCounts[dayNum]?.items || [];
  }, [selectedDay, monthStats]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header onLogout={isAdmin ? handleLogout : undefined} />
      <main className="flex-grow flex flex-col">
        {isUserLoading || isCheckingAdmin ? (
          <LoadingScreen 
            fullScreen={false} 
            message="RICONOSCIMENTO SISTEMA" 
            submessage="Identificazione amministratore GMC in corso..." 
          />
        ) : (
          <AuthGuard isAdmin={isAdmin}>
            <div className="flex-1 container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h1 className="text-3xl font-headline font-bold tracking-tight text-primary flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-primary" /> Dashboard Statistiche
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Analisi e monitoraggio delle ammissioni soci e delle domande d'iscrizione.
              </p>
            </div>

            {/* Mode Switch & Date Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={dashboardMode} onValueChange={(v) => { setDashboardMode(v as any); setSelectedDay(null); }}>
                <TabsList className="bg-secondary/80">
                  <TabsTrigger value="approvals" className="gap-2 font-bold text-xs">
                    <UserCheck className="w-3.5 h-3.5" /> Approvazioni Soci
                  </TabsTrigger>
                  <TabsTrigger value="requests" className="gap-2 font-bold text-xs">
                    <Inbox className="w-3.5 h-3.5" /> Domande Ricevute
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 bg-secondary/60 p-2 rounded-xl border border-border">
                <CalendarIcon className="w-4 h-4 text-primary ml-1" />
                <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setSelectedDay(null); }}>
                  <SelectTrigger className="w-[130px] h-8 text-xs font-semibold bg-background">
                    <SelectValue placeholder="Mese" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => {
                      const val = String(idx + 1).padStart(2, '0');
                      return <SelectItem key={val} value={val}>{name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setSelectedDay(null); }}>
                  <SelectTrigger className="w-[90px] h-8 text-xs font-semibold bg-background">
                    <SelectValue placeholder="Anno" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {dashboardMode === 'approvals' ? 'Approvazioni Oggi' : 'Richieste Oggi'}
                    </CardTitle>
                    <UserCheck className="w-5 h-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black">{monthStats.todayCount}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {dashboardMode === 'approvals' ? 'Nuovi soci ammessi oggi' : 'Nuove domande inoltrate oggi'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 via-background to-background border-emerald-500/20 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Totale Mese ({MONTH_NAMES[parseInt(selectedMonth, 10) - 1]})
                    </CardTitle>
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-emerald-500">{monthStats.totalMonthCount}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">Media di ~{monthStats.avgDaily} al giorno</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-sky-500/10 via-background to-background border-sky-500/20 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Firme SMS OTP
                    </CardTitle>
                    <Smartphone className="w-5 h-5 text-sky-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-sky-500">{monthStats.totalSmsMonth}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {monthStats.totalMonthCount > 0 
                        ? `${Math.round((monthStats.totalSmsMonth / monthStats.totalMonthCount) * 100)}% del mese`
                        : "0% del mese"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 via-background to-background border-purple-500/20 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Firme Cartacee / Admin
                    </CardTitle>
                    <FileText className="w-5 h-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-purple-500">{monthStats.totalPaperMonth}</div>
                    <p className="text-[11px] text-muted-foreground mt-1">Modulo cartaceo o registrati da segreteria</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Section */}
              <Card className="border-border">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold">
                        {dashboardMode === 'approvals' ? 'Andamento Approvazioni Soci' : 'Andamento Domande Ricevute'} - {MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} {selectedYear}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Clicca su una barra del grafico per vedere la lista dettagliata del giorno.
                      </CardDescription>
                    </div>
                    {selectedDay && (
                      <Button size="sm" variant="outline" onClick={() => setSelectedDay(null)} className="self-start sm:self-auto text-xs">
                        Mostra Tutto il Mese
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthStats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border text-xs space-y-1">
                                  <div className="font-bold border-b pb-1 mb-1">{data.fullDate}</div>
                                  <div className="text-primary font-bold">Totale: {data.Totale}</div>
                                  <div className="text-sky-400">SMS OTP: {data["SMS OTP"]}</div>
                                  <div className="text-purple-400">Cartaceo/Admin: {data["Cartaceo / Diretto"]}</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="Totale"
                          radius={[4, 4, 0, 0]}
                          onClick={(entry) => setSelectedDay(entry.rawDay)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {monthStats.chartData.map((entry) => (
                            <Cell
                              key={`cell-${entry.dayLabel}`}
                              fill={selectedDay === entry.rawDay ? "#10b981" : (dashboardMode === 'approvals' ? "#6366f1" : "#eab308")}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Day List Section */}
              <Card className="border-border">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" /> 
                        {selectedDay 
                          ? `${dashboardMode === 'approvals' ? 'Soci Approvati' : 'Domande Ricevute'} il ${selectedDay}/${selectedMonth}/${selectedYear}`
                          : `${dashboardMode === 'approvals' ? 'Tutti i Soci Approvati' : 'Tutte le Domande Ricevute'} in ${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {selectedDay 
                          ? `Elenco dettagliato del giorno ${selectedDay}/${selectedMonth}/${selectedYear} (${selectedDayItems.length} record)`
                          : `Elenco completo del mese (${monthStats.totalMonthCount} record totali)`}
                      </CardDescription>
                    </div>

                    {/* Day quick selector dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-semibold">Filtra Giorno:</span>
                      <Select value={selectedDay || "all"} onValueChange={(v) => setSelectedDay(v === "all" ? null : v)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
                          <SelectValue placeholder="Tutti i giorni" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          <SelectItem value="all">Tutti i giorni</SelectItem>
                          {Array.from({ length: monthStats.daysInMonth }, (_, i) => {
                            const val = String(i + 1).padStart(2, '0');
                            const count = monthStats.dailyCounts[i + 1]?.count || 0;
                            return (
                              <SelectItem key={val} value={val}>
                                Giorno {val} ({count})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {((selectedDay ? selectedDayItems : validItems.filter(item => {
                    const dateStr = dashboardMode === 'approvals' ? (item.joinDate || item.submittedAt) : (item.requestDate || item.submittedAt);
                    const d = parseDate(dateStr);
                    return d && d.getFullYear() === parseInt(selectedYear, 10) && d.getMonth() === parseInt(selectedMonth, 10) - 1;
                  })).length === 0) ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Nessun record trovato per la data selezionata.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs uppercase tracking-wider">
                            <TableHead className="w-28">{dashboardMode === 'approvals' ? 'N. Tessera' : 'Stato'}</TableHead>
                            <TableHead>Nominativo</TableHead>
                            <TableHead className="hidden md:table-cell">Data & Ora</TableHead>
                            <TableHead className="hidden sm:table-cell">Contatti</TableHead>
                            <TableHead>Firma / Modalità</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedDay ? selectedDayItems : validItems.filter(item => {
                            const dateStr = dashboardMode === 'approvals' ? (item.joinDate || item.submittedAt) : (item.requestDate || item.submittedAt);
                            const d = parseDate(dateStr);
                            return d && d.getFullYear() === parseInt(selectedYear, 10) && d.getMonth() === parseInt(selectedMonth, 10) - 1;
                          })).map((socio) => {
                            const sig = getSignatureMetadata(socio);
                            const dateStr = dashboardMode === 'approvals' ? (socio.joinDate || socio.submittedAt) : (socio.requestDate || socio.submittedAt);
                            const dateObj = parseDate(dateStr);
                            const timeStr = dateObj ? dateObj.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';

                            return (
                              <TableRow key={socio.id} className="text-sm">
                                <TableCell className="font-mono font-bold text-primary">
                                  {dashboardMode === 'approvals' ? (socio.tessera || '-') : (
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px]">
                                      IN ATTESA
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="font-semibold">
                                  <div>{getFullName(socio)}</div>
                                  <div className="text-[11px] text-muted-foreground font-normal md:hidden">
                                    {formatDate(dateStr)} {timeStr}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs">
                                  <div className="font-medium">{formatDate(dateStr)}</div>
                                  <div className="text-muted-foreground text-[11px]">{timeStr ? `ore ${timeStr}` : ''}</div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                                  <div>{socio.phone || '-'}</div>
                                  <div className="text-[11px]">{socio.email || '-'}</div>
                                </TableCell>
                                <TableCell>
                                  {sig.method === 'SMS_OTP' ? (
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-bold gap-1">
                                      <ShieldCheck className="w-3 h-3" /> SMS OTP ({sig.signerPhone || socio.phone})
                                    </Badge>
                                  ) : sig.method === 'ADMIN_DIRECT' ? (
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[10px] font-bold gap-1">
                                      👤 REGISTRAZIONE ADMIN
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/30 text-[10px] font-bold gap-1">
                                      📄 MODULO CARTACEO
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AuthGuard>
    )}
  </main>
</div>
  );
}
