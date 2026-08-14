'use client';

import { useState, useTransition } from 'react';
import { queueConductorRequest } from '@/app/actions';

type Props = {
  projectId: string;
  placeholder: string;
};

export default function ConductorChat({ projectId, placeholder }: Props) {
  const [value, setValue] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = value;
    setNote(null);

    startTransition(async () => {
      const result = await queueConductorRequest(projectId, text);
      setNote({ ok: result.ok, text: result.message });
      if (result.ok) setValue('');
    });
  }

  return (
    <>
      <form className="conductor-chat" onSubmit={handleSubmit}>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          maxLength={2000}
          aria-label="Conductorへの依頼"
        />
        <button type="submit" disabled={pending}>
          {pending ? '...' : 'Send'}
        </button>
      </form>
      <p className={`conductor-note ${note ? (note.ok ? 'ok' : 'err') : ''}`} role="status">
        {note?.text ?? ''}
      </p>
    </>
  );
}
