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
        className="bg-white/90 backdrop-blur-xl w-full max-w-lg rounded-[2rem] shadow-xl border border-white/60 overflow-hidden flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="client-notes-title"
        tabIndex={-1}
      >
        <div className="p-6 border-b border-brand-secondary/30 flex justify-between items-center bg-white/50">
          <h2 id="client-notes-title" className="text-xl font-heading font-bold text-brand-text">
            Notes for {clientName}
          </h2>
          <button 
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 hover:bg-brand-secondary/20 rounded-full transition-colors"
            aria-label="Close client notes"
          >
            <X className="w-5 h-5 text-brand-text/60" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-brand-bg/30">
          {notes.length === 0 ? (
            <p className="text-center text-brand-text/50 py-8">No notes yet for this client.</p>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="bg-white p-4 rounded-xl border border-brand-secondary/30 shadow-sm">
                  <p className="text-sm text-brand-text whitespace-pre-wrap">{note.text}</p>
                  <p className="text-xs text-brand-text/40 mt-2 text-right">
                    {note.createdAt?.toDate ? format(note.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-brand-secondary/30 bg-white/50">
          <form onSubmit={handleAddNote} className="space-y-3">
            <label htmlFor="client-note-text" className="sr-only">
              Private note for {clientName}
            </label>
            <textarea
              id="client-note-text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Type a private note..."
              className="w-full p-3 bg-white border border-brand-secondary/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/50 text-sm resize-none h-24"
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
