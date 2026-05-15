import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import OfflineBanner from '@/components/pwa/OfflineBanner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#070c12',
        backgroundImage:
          'radial-gradient(ellipse at 10% 10%, #0f1e2e 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, #0a1200 0%, transparent 50%)',
        color: '#ddd0b8',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}
    >
      <OfflineBanner />
      <TopBar />
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
