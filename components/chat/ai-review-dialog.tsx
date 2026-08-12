'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, CalendarClock, CircleAlert, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiGetAiReview, apiQueueAiReview, type ChatAiReview, type StoredChatAiReview } from '@/lib/client/api';

export function AiReviewDialog() {
  const [open, setOpen] = useState(false);
  const [stored, setStored] = useState<StoredChatAiReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [queueing, setQueueing] = useState(false);

  const loadReview = useCallback(async () => {
    setLoading(true);
    try {
      setStored(await apiGetAiReview());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load the AI review');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const current = await apiGetAiReview();
      setStored(current);
      if (!current.exists) {
        await apiQueueAiReview();
        await loadReview();
      }
    })().catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load the AI review'));
  }, [open, loadReview]);

  useEffect(() => {
    if (!open || !stored || (stored.status !== 'pending' && stored.status !== 'processing')) return;
    const poll = window.setInterval(() => void loadReview(), 4_000);
    return () => window.clearInterval(poll);
  }, [open, stored, loadReview]);

  const refresh = async () => {
    setQueueing(true);
    try {
      await apiQueueAiReview();
      await loadReview();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to queue the AI review');
    } finally {
      setQueueing(false);
    }
  };

  const review: ChatAiReview | null = stored?.review || null;
  const processing = stored?.status === 'pending' || stored?.status === 'processing';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl transition-transform hover:scale-105" aria-label="Review chat with AI"><Bot className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI chat review</DialogTitle>
          <DialogDescription>Saved review data is shown immediately. New messages and media are analyzed in the background on your private local AI runtime.</DialogDescription>
        </DialogHeader>
        {loading && !stored && <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Loading saved review…</div>}
        {processing && <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground"><Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" /><div><p className="font-medium text-foreground">Updating review in the background</p><p className="mt-1">You can close this window. It will refresh automatically when the saved result is ready.</p></div></div>}
        {stored?.status === 'failed' && <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /><div><p className="font-medium">Background analysis failed</p><p className="mt-1 text-muted-foreground">{stored.error || 'Check that Ollama, Whisper, and FFmpeg are running, then retry.'}</p></div></div>}
        {review && (
          <div className="space-y-5 text-sm">
            <section><h3 className="mb-1 font-semibold">Summary</h3><p className="leading-6 text-muted-foreground">{review.summary}</p></section>
            {review.highlights.length > 0 && <section><h3 className="mb-1 font-semibold">Highlights</h3><ul className="list-disc space-y-1 pl-5 text-muted-foreground">{review.highlights.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
            <section><h3 className="mb-2 flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" />Tasks & reminders</h3>{review.reminders.length ? <div className="space-y-2">{review.reminders.map((item, index) => <div className="rounded-lg border bg-muted/30 p-3" key={index}><p className="font-medium">{item.task}</p><p className="mt-1 text-xs text-muted-foreground">{item.due ? `Due: ${item.due}` : 'No date stated'} · {item.source}</p><p className="mt-2 border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">“{item.evidence}”</p></div>)}</div> : <p className="text-muted-foreground">No tasks or reminders were found.</p>}</section>
            <p className="text-xs text-muted-foreground">Analyzed: {review.analyzed.text} text, {review.analyzed.images} images, {review.analyzed.audio} audio, and {review.analyzed.videos} videos.</p>
            {review.warnings.length > 0 && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">{review.warnings.join(' ')}</p>}
          </div>
        )}
        {!loading && !review && !processing && stored?.status !== 'failed' && <p className="py-6 text-sm text-muted-foreground">No saved review exists yet. It will be prepared in the background.</p>}
        <Button variant="outline" onClick={refresh} disabled={queueing || processing} className="w-fit"><RefreshCw className={`mr-2 h-4 w-4 ${queueing ? 'animate-spin' : ''}`} />{stored?.status === 'failed' ? 'Retry analysis' : 'Refresh saved review'}</Button>
      </DialogContent>
    </Dialog>
  );
}
