import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard — ComptaFlow',
  description: 'Tableau de bord financier de votre micro-entreprise',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
