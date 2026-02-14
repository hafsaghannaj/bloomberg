'use client';

import CommandBar from '@/components/CommandBar/CommandBar';
import TickerTape from '@/components/TickerTape/TickerTape';
import TabBar from '@/components/UI/TabBar';
import NotificationToast from '@/components/UI/NotificationToast';
import { useRecorderScheduler } from '@/hooks/useRecorderScheduler';
import { useTerminalStore } from '@/store/terminal';

interface Props {
  children: React.ReactNode;
}

export default function TerminalShell({ children }: Props) {
  // Auto-start recorder at 9:30 AM ET, auto-stop at 4:00 PM ET, Mon-Fri
  useRecorderScheduler();

  return (
    <div className="h-screen flex flex-col bg-bloomberg-bg safe-area-shell">
      <CommandBar />
      <TickerTape />
      <TabBar />
      <div className="flex-1 overflow-hidden">{children}</div>
      <StatusBar />
      <NotificationToast />
    </div>
  );
}

function StatusBar() {
  const recorderActive = useTerminalStore((s) => s.recorderActive);

  return (
    <div className="h-6 bg-bloomberg-bg-header border-t border-bloomberg-border flex items-center px-3 justify-between text-[10px] shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-bloomberg-green">CONNECTED</span>
        {recorderActive && (
          <span className="text-bloomberg-green animate-pulse">REC</span>
        )}
        <span className="text-bloomberg-text-muted">
          ESC: Home | /: Search | F2: Command
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-bloomberg-text-muted">
          TOP NEWS WL PORT REC ALERTS
        </span>
        <span className="text-bloomberg-amber">BLOOMBERG TERMINAL</span>
      </div>
    </div>
  );
}
