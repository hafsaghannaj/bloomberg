'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTerminalStore } from '@/store/terminal';
import { FileText, Download, Save, Calendar, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function formatDateLabel(dateKey: string) {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getAllNoteDates(): string[] {
  const dates: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('notes-')) {
      dates.push(key.replace('notes-', ''));
    }
  }
  return dates.sort().reverse();
}

export default function DailyNotes() {
  const [currentDate, setCurrentDate] = useState(getTodayKey());
  const [content, setContent] = useState('');
  const [savedDates, setSavedDates] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const { addNotification } = useTerminalStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load note for current date
  useEffect(() => {
    const saved = localStorage.getItem(`notes-${currentDate}`);
    setContent(saved || '');
    setSavedDates(getAllNoteDates());
  }, [currentDate]);

  // Auto-save with debounce
  const flashSaved = useCallback(() => {
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  }, []);

  const autoSave = useCallback(
    (text: string) => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        if (text.trim()) {
          localStorage.setItem(`notes-${currentDate}`, text);
          setLastSaved(new Date().toLocaleTimeString('en-US', { hour12: false }));
          setSavedDates(getAllNoteDates());
          flashSaved();
        } else {
          localStorage.removeItem(`notes-${currentDate}`);
          setSavedDates(getAllNoteDates());
          setLastSaved('');
        }
      }, 800);
    },
    [currentDate, flashSaved]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    autoSave(text);
  };

  const handleManualSave = () => {
    if (content.trim()) {
      localStorage.setItem(`notes-${currentDate}`, content);
      setLastSaved(new Date().toLocaleTimeString('en-US', { hour12: false }));
      setSavedDates(getAllNoteDates());
      flashSaved();
      addNotification(`Notes saved for ${formatDateLabel(currentDate)}`, 'success');
    }
  };

  // Ctrl+S / Cmd+S keyboard shortcut to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const navigateDate = (direction: -1 | 1) => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const deleteNote = () => {
    localStorage.removeItem(`notes-${currentDate}`);
    setContent('');
    setLastSaved('');
    setSavedDates(getAllNoteDates());
    addNotification(`Notes deleted for ${formatDateLabel(currentDate)}`, 'info');
  };

  const exportToPdf = async () => {
    if (!content.trim()) return;
    setExporting(true);

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;
      const lineHeight = 6;
      const footerY = pageHeight - 10;

      const addHeader = (pageNum: number) => {
        doc.setFontSize(18);
        doc.setTextColor(255, 140, 0);
        doc.text('BLOOMBERG TERMINAL - DAILY NOTES', margin, 20);

        doc.setFontSize(12);
        doc.setTextColor(150, 150, 150);
        doc.text(formatDateLabel(currentDate), margin, 30);

        doc.setDrawColor(42, 42, 42);
        doc.line(margin, 34, pageWidth - margin, 34);

        // Page number (skip on page 1 if single page)
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated ${new Date().toLocaleString()}`, margin, footerY);
        if (pageNum > 0) {
          doc.text(`Page ${pageNum + 1}`, pageWidth - margin - 15, footerY);
        }
      };

      addHeader(0);

      // Split content into lines that fit the page width
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      const lines: string[] = doc.splitTextToSize(content, contentWidth);

      let y = 42;
      let pageNum = 0;

      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > footerY - 5) {
          // Start a new page
          doc.addPage();
          pageNum++;
          addHeader(pageNum);
          doc.setFontSize(11);
          doc.setTextColor(60, 60, 60);
          y = 42;
        }
        doc.text(lines[i], margin, y);
        y += lineHeight;
      }

      // Update page 1 with total pages if multi-page
      if (pageNum > 0) {
        for (let p = 0; p <= pageNum; p++) {
          doc.setPage(p + 1);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          // Overwrite page number area
          doc.setFillColor(255, 255, 255);
          doc.rect(pageWidth - margin - 30, footerY - 4, 30, 6, 'F');
          doc.text(`Page ${p + 1} of ${pageNum + 1}`, pageWidth - margin - 28, footerY);
        }
      }

      const filename = `notes-${currentDate}.pdf`;

      // Trigger browser download
      doc.save(filename);

      // Also save to server (skip in standalone/iOS mode)
      try {
        const pdfBase64 = doc.output('datauristring').split(',')[1];
        const res = await fetch('/api/save-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64, filename }),
        });

        if (res.ok) {
          addNotification(`PDF downloaded & saved to pdf/${filename}`, 'success');
        } else {
          addNotification(`PDF downloaded`, 'success');
        }
      } catch {
        addNotification(`PDF downloaded`, 'success');
      }
    } catch (err) {
      console.error('PDF export error:', err);
      addNotification('Failed to export PDF', 'alert');
    } finally {
      setExporting(false);
    }
  };

  const isToday = currentDate === getTodayKey();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-bloomberg-border flex items-center justify-between shrink-0">
        <span className="text-bloomberg-amber text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={12} /> Daily Notes
        </span>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className={`text-[10px] transition-colors duration-300 ${
              saveFlash ? 'text-bloomberg-green font-bold' : 'text-bloomberg-green/60'
            }`}>
              {saveFlash ? 'SAVED' : `Saved ${lastSaved}`}
            </span>
          )}
          <button
            onClick={handleManualSave}
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded border transition-colors ${
              saveFlash
                ? 'border-bloomberg-green text-bloomberg-green bg-bloomberg-green/10'
                : 'border-bloomberg-border text-bloomberg-text-muted hover:text-bloomberg-orange hover:border-bloomberg-orange'
            }`}
            title="Save (Ctrl+S)"
          >
            <Save size={10} />
            SAVE
          </button>
          <button
            onClick={exportToPdf}
            disabled={exporting || !content.trim()}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
              exporting
                ? 'border-bloomberg-amber text-bloomberg-amber animate-pulse'
                : !content.trim()
                ? 'border-bloomberg-border text-bloomberg-text-muted cursor-not-allowed'
                : 'border-bloomberg-orange text-bloomberg-orange hover:bg-bloomberg-orange hover:text-black'
            }`}
          >
            <Download size={10} />
            {exporting ? 'EXPORTING...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="px-3 py-1.5 border-b border-bloomberg-border flex items-center justify-between shrink-0 bg-bloomberg-bg-header">
        <button
          onClick={() => navigateDate(-1)}
          className="text-bloomberg-text-muted hover:text-bloomberg-orange"
        >
          <ChevronLeft size={14} />
        </button>
        <div className="flex items-center gap-2">
          <Calendar size={11} className="text-bloomberg-text-muted" />
          <span className={`text-xs ${isToday ? 'text-bloomberg-orange font-bold' : 'text-bloomberg-text-secondary'}`}>
            {formatDateLabel(currentDate)}
            {isToday && <span className="text-bloomberg-green ml-1.5">TODAY</span>}
          </span>
        </div>
        <button
          onClick={() => navigateDate(1)}
          className="text-bloomberg-text-muted hover:text-bloomberg-orange"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 flex min-h-0">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          placeholder="Start typing your notes for today..."
          className="flex-1 bg-bloomberg-bg p-3 text-bloomberg-text-secondary text-sm leading-relaxed outline-none resize-none placeholder-bloomberg-text-muted/50 font-mono"
          spellCheck={false}
        />

        {/* Sidebar: saved dates */}
        <div className="w-28 border-l border-bloomberg-border overflow-y-auto shrink-0">
          <div className="px-2 py-1.5 text-bloomberg-text-muted text-[9px] uppercase tracking-wider border-b border-bloomberg-border">
            History
          </div>
          {savedDates.length === 0 ? (
            <div className="px-2 py-3 text-bloomberg-text-muted text-[10px]">
              No saved notes
            </div>
          ) : (
            savedDates.map((date) => (
              <button
                key={date}
                onClick={() => setCurrentDate(date)}
                className={`w-full text-left px-2 py-1 text-[10px] border-b border-bloomberg-border/50 ${
                  date === currentDate
                    ? 'bg-bloomberg-bg-hover text-bloomberg-orange'
                    : 'text-bloomberg-text-muted hover:text-bloomberg-text-secondary hover:bg-bloomberg-bg-hover'
                }`}
              >
                {date}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Footer toolbar */}
      <div className="px-3 py-1 border-t border-bloomberg-border flex items-center justify-between text-[10px] shrink-0 bg-bloomberg-bg-header">
        <span className="text-bloomberg-text-muted">
          {content.length} chars | {content.split(/\s+/).filter(Boolean).length} words
        </span>
        <div className="flex items-center gap-3">
          {content.trim() && (
            <button
              onClick={deleteNote}
              className="text-bloomberg-text-muted hover:text-bloomberg-red flex items-center gap-1"
            >
              <Trash2 size={10} /> Delete
            </button>
          )}
          <span className="text-bloomberg-text-muted">Auto-save ON</span>
        </div>
      </div>
    </div>
  );
}
