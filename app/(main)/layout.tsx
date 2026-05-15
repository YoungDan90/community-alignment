import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070c12',
        backgroundImage:
          'radial-gradient(ellipse at 10% 10%, #0f1e2e 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, #0a1200 0%, transparent 50%)',
        color: '#ddd0b8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TopBar />
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>{children}</main>
      <BottomNav />
    </div>
  );
}
