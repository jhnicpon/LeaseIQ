import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/ui/Sidebar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect('/auth/signin');

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      {/* On mobile, add top padding so content isn't hidden behind the hamburger button */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
