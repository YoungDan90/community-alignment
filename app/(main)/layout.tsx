import AppShell from '@/components/layout/AppShell';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import OfflineBanner from '@/components/pwa/OfflineBanner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <OfflineBanner />
      {children}
      <InstallPrompt />
    </AppShell>
  );
}
