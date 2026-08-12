'use client';

import { useEffect, useState } from 'react';
import { Bot, CalendarClock, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiCreateAiReview, type ChatAiReview } from '@/lib/client/api';

export function AiReviewDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ChatAiReview | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const startedAt = Date.now();
    const interval = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1_000);
    return () => window.clearInterval(interval);
  }, [loading]);

  const runReview = async () => {
    setLoading(true);
    setElapsedSeconds(0);
    try {
      setReview(await apiCreateAiReview());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to review the chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl transition-transform hover:scale-105" aria-label="Review chat with AI">
          <Bot className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />AI chat review</DialogTitle>
          <DialogDescription>Runs locally with Ollama. Text, images, speech, and video are reviewed without sending your chat to a paid cloud service.</DialogDescription>
        </DialogHeader>
        {!review && !loading && <Button onClick={runReview}>Review this chat</Button>}
        {loading && <div className="flex items-center gap-3 py-10 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" /><div><p>Analyzing your chat and media…</p><p className="mt-1 text-xs">{elapsedSeconds}s elapsed · First-time media analysis can take a few minutes; later reviews use the local cache.</p></div></div>}
        {review && !loading && (
          <div className="space-y-5 text-sm">
            <section><h3 className="mb-1 font-semibold">Summary</h3><p className="leading-6 text-muted-foreground">{review.summary}</p></section>
            {review.highlights.length > 0 && <section><h3 className="mb-1 font-semibold">Highlights</h3><ul className="list-disc space-y-1 pl-5 text-muted-foreground">{review.highlights.map((item, index) => <li key={index}>{item}</li>)}</ul></section>}
            <section><h3 className="mb-2 flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" />Tasks & reminders</h3>{review.reminders.length ? <div className="space-y-2">{review.reminders.map((item, index) => <div className="rounded-lg border bg-muted/30 p-3" key={index}><p className="font-medium">{item.task}</p><p className="mt-1 text-xs text-muted-foreground">{item.due ? `Due: ${item.due}` : 'No date stated'} · {item.source}</p><p className="mt-2 border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">“{item.evidence}”</p></div>)}</div> : <p className="text-muted-foreground">No high-confidence tasks or reminders were found.</p>}</section>
            <p className="text-xs text-muted-foreground">Analyzed: {review.analyzed.text} text, {review.analyzed.images} images, {review.analyzed.audio} audio, and {review.analyzed.videos} videos.</p>
            {review.warnings.length > 0 && <p className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">{review.warnings.join(' ')}</p>}
            <Button variant="outline" onClick={runReview} disabled={loading}>Run again</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
