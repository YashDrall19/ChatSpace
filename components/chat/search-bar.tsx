'use client';

import { useState, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  onSearch: (term: string) => void;
  searching: boolean;
}

export function SearchBar({ onSearch, searching }: SearchBarProps) {
  const [term, setTerm] = useState('');

  const debouncedSearch = useCallback(
    debounce((value: string) => onSearch(value), 300),
    [onSearch]
  );

  return (
    <div className="flex shrink-0 items-center gap-2 border-b bg-card px-4 py-2 lg:px-6">
      <Search className="h-4 w-4 text-muted-foreground" />
      <Input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          debouncedSearch(e.target.value);
        }}
        placeholder="Search messages..."
        className="border-0 bg-transparent focus-visible:ring-0"
        autoFocus
      />
      {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      {term && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => {
            setTerm('');
            onSearch('');
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
