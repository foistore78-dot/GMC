"use client";

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Socio } from '@/lib/soci-data';
import { getStatus } from '@/components/soci-table';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, UserPlus, Clock, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, getMonth, getYear, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';


const StatCard = ({ title, value, icon, link, description }: { title: string, value: number, icon: React.ReactNode, link?: string, description?: string }) => {
  const cardContent = (
    <Card className="hover:border-primary/50 transition-colors duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );

  if (link) {
    return <Link href={link}>{cardContent}</Link>;
  }

  return cardContent;
};


export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const membersQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "members") : null),
    [firestore]
  );
  const requestsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, "membership_requests") : null),
    [firestore]
  );

  const { data: membersData, isLoading: isMembersLoading } = useCollection<Socio>(membersQuery);
  const { data: requestsData, isLoading: isRequestsLoading } = useCollection<Socio>(requestsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const stats = useMemo(() => {
    const allMembers = membersData || [];
    const allRequests = requestsData || [];
    
    const currentYear = new Date().getFullYear();

    const pendingApproval = allRequests.filter(req => getStatus(req) === 'pending').length;
    
    const expiredMembers = allMembers.filter(mem => getStatus(mem) === 'expired').length;
    
    // Corrected Logic: Count all members (active and expired) for their respective membership year.
    const membersByYear = allMembers.reduce((acc, mem) => {
      const year = mem.membershipYear || 'N/A';
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);


    const monthlySignups = Array(12).fill(0);
    allMembers.forEach(member => {
        if(member.joinDate) {
            try {
                const joinDate = parseISO(member.joinDate);
                if(getYear(joinDate) === currentYear) {
                    const month = getMonth(joinDate);
                    monthlySignups[month]++;
                }
            } catch(e) {
                console.error("Invalid joinDate format for member:", member.id, member.joinDate);
            }
        }
    });
    
    const chartData = monthlySignups.map((count, index) => ({
      name: format(new Date(currentYear, index), 'MMM', { locale: it }),
      'Nuovi Soci': count,
    }));

    return {
      pendingApproval,
      expiredMembers,
      members_2024: membersByYear['2024'] || 0,
      members_2025: membersByYear['2025'] || 0,
      members_2026: membersByYear['2026'] || 0,
      chartData,
    };
  }, [membersData, requestsData]);

  const isLoading = isUserLoading || isMembersLoading || isRequestsLoading;

  if (isLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Users className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          <h1 className="font-headline text-3xl md:text-5xl text-primary">
            Dashboard
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard 
                title="In Attesa di Approvazione"
                value={stats.pendingApproval}
                icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
                link="/admin/elenco?tab=pending"
                description="Nuove richieste da esaminare"
            />
             <StatCard 
                title="In Attesa di Rinnovo"
                value={stats.expiredMembers}
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                link="/admin/elenco?tab=active&hideExpired=false"
                description="Soci con tesseramento scaduto"
            />
            <StatCard 
                title="Soci (2025)"
                value={stats.members_2025}
                icon={<History className="h-4 w-4 text-muted-foreground" />}
                link="/admin/elenco?filter=2025"
                description="Iscritti per l'anno prossimo"
            />
            <StatCard 
                title="Soci (2026)"
                value={stats.members_2026}
                icon={<History className="h-4 w-4 text-muted-foreground" />}
                link="/admin/elenco?filter=2026"
                description="Iscritti per l'anno successivo"
            />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Nuove Iscrizioni Mensili ({new Date().getFullYear()})</CardTitle>
                <CardDescription>Grafico delle nuove ammissioni di soci durante l'anno in corso.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={stats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                            dataKey="name"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis 
                             stroke="hsl(var(--muted-foreground))"
                             fontSize={12}
                             tickLine={false}
                             axisLine={false}
                             allowDecimals={false}
                             tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip 
                            cursor={{ fill: 'hsla(var(--accent), 0.2)' }}
                            contentStyle={{ 
                                background: 'hsl(var(--background))', 
                                border: '1px solid hsl(var(--border))',
                                color: 'hsl(var(--foreground))'
                            }} 
                        />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                        <Bar dataKey="Nuovi Soci" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
