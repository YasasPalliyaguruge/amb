import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase-db';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { logAudit } from '../utils/auditLogger';
import { useAuth } from '../contexts/AuthContext';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface ClientNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

interface Note {
  id: string;
  text: string;
  createdAt: any;
}

export default function ClientNotesModal({ isOpen, onClose, clientId, clientName }: ClientNotesModalProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useModalFocusTrap({
    isOpen,
    modalRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (!isOpen || !clientId) return;

    const q = query(
      collection(db, 'clientNotes'),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes: Note[] = [];
      snapshot.forEach((doc) => {
        fetchedNotes.push({ id: doc.id, ...doc.data() } as Note);
      });
      setNotes(fetchedNotes);
    }, (err) => {
      console.error("Error fetching notes:", err);
      toast.error("Failed to load client notes");
    });

    return () => unsubscribe();
  }, [isOpen, clientId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'clientNotes'), {
        clientId,
        text: newNote.trim(),
        createdAt: serverTimestamp()
      });
      setNewNote('');
      toast.success('Note added successfully');
      
      if (user) {
        logAudit(user.uid, user.email || 'unknown', 'ADD_CLIENT_NOTE', `Added a note for client ${clientName}`, clientId);
      }
    } catch (err: any) {
      console.error("Error adding note:", err);
      toast.error(err.message || 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-text/20 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="theme-panel flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-[rgb(var(--theme-surface-strong-rgb)/0.96)] shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-notes-title"
        tabIndex={-1}
      >
        <div className="flex items-center justify-between border-b border-[rgb(var(--theme-line-rgb)/0.28)] bg-[rgb(var(--theme-surface-rgb)/0.46)] p-6">
          <h2 id="client-notes-title" className="text-xl font-heading font-bold text-[rgb(var(--theme-text-rgb))]">
            Notes for {clientName}
          </h2>
          <button 
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-[rgb(var(--theme-secondary-rgb)/0.16)]"
            aria-label="Close client notes"
          >
            <X className="w-5 h-5 text-[rgb(var(--theme-muted-rgb))]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[rgb(var(--theme-bg-rgb)/0.3)] p-6">
          {notes.length === 0 ? (
            <p className="py-8 text-center text-[rgb(var(--theme-muted-rgb))]">No notes yet for this client.</p>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="rounded-xl border border-[rgb(var(--theme-line-rgb)/0.22)] bg-[rgb(var(--theme-surface-strong-rgb)/0.92)] p-4 shadow-sm">
                  <p className="whitespace-pre-wrap text-sm text-[rgb(var(--theme-text-rgb))]">{note.text}</p>
                  <p className="mt-2 text-right text-xs text-[rgb(var(--theme-muted-rgb))]">
                    {note.createdAt?.toDate ? format(note.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-[rgb(var(--theme-line-rgb)/0.28)] bg-[rgb(var(--theme-surface-rgb)/0.46)] p-6">
          <form onSubmit={handleAddNote} className="space-y-3">
            <label htmlFor="client-note-text" className="sr-only">
              Private note for {clientName}
            </label>
            <textarea
              id="client-note-text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Type a private note..."
              className="h-24 w-full resize-none rounded-xl border border-[rgb(var(--theme-line-rgb)/0.34)] bg-[rgb(var(--theme-surface-strong-rgb)/0.96)] p-3 text-sm text-[rgb(var(--theme-text-rgb))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--theme-primary-rgb)/0.5)]"
              required
            />
            <button 
              type="submit"
              disabled={isSubmitting || !newNote.trim()}
              className="w-full py-2.5 px-4 bg-brand-primary text-white rounded-xl font-medium shadow-sm hover:shadow-md hover:bg-brand-primary/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Note'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
