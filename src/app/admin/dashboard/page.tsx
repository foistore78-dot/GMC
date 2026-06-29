import DashboardClient from "./DashboardClient";

export const metadata = {
  title: "Dashboard Approvazioni | Garage Music Club",
  description: "Statistiche e monitoraggio delle iscrizioni e approvazioni soci.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
