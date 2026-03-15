
import { redirect } from 'next/navigation';

export default function DashboardLayout() {
  // Reindirizzamento automatico alla home del Club per evitare confusione con il template Canvas
  redirect('/');
}
