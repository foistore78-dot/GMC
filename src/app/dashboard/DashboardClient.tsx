"use client";

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Socio } from '@/lib/soci-data';
import { getStatus } from '@/components/soci-table';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, UserPlus, Clock, History, CalendarFuture } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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


export default function DashboardClient() {
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
    
    const members_2024 = allMembers.filter(m => m.membershipYear === '2024').length;
    const members_2025 = allMembers.filter(m => m.membershipYear === '2025').length;
    const members_future = allMembers.filter(m => m.membershipYear && parseInt(m.membershipYear) > 2025).length;


    const monthlySignups = Array(12).fill(0);
    allMembers.forEach(member => {
        if(member.joinDate) {
            try {
                const joinDate = new Date(member.joinDate);
                if(joinDate.getFullYear() === currentYear) {
                    const month = joinDate.getMonth();
                    monthlySignups[month]++;
                }
            } catch(e) {
                console.error("Invalid joinDate format for member:", member.id, member.joinDate);
            }
        }
    });

    const monthNames = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    
    const chartData = monthlySignups.map((count, index) => ({
      name: monthNames[index],
      'Nuovi Soci': count,
    }));

    return {
      pendingApproval,
      expiredMembers,
      members_2024,
      members_2025,
      members_future,
      chartData,
    };
  }, [membersData, requestsData]);

  const isLoading = isUserLoading || isMembersLoading || isRequestsLoading;

  if (isLoading || !user) {
    return (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex-grow container mx-auto px-4 py-8">
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
                link="/admin/elenco?tab=requests"
                description="Nuove richieste da esaminare"
            />
             <StatCard 
                title="In Attesa di Rinnovo"
                value={stats.expiredMembers}
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                link="/admin/elenco?tab=expired"
                description="Soci con tesseramento scaduto"
            />
            <StatCard 
                title="Soci Futuri (2025)"
                value={stats.members_2025}
                icon={<CalendarFuture className="h-4 w-4 text-muted-foreground" />}
                link="/admin/elenco?filter=2025"
                description="Iscritti per l'anno 2025"
            />
            <StatCard 
                title="Soci Futuri (Oltre 2025)"
                value={stats.members_future}
                icon={<History className="h-4 w-4 text-muted-foreground" />}
                link="/admin/elenco?filter=2026"
                description="Iscritti per gli anni successivi"
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
      </div>
  );
}
