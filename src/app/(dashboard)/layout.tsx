import { redirect } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Redirigi sempre alla home se qualcuno prova ad accedere a rotte dashboard non configurate
  redirect('/');
  return <>{children}</>;
}
