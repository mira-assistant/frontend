import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { personsApi } from '@dadei/ui/lib/api/persons';
import { Person } from '@dadei/ui/types/models.types';
import { useNotifications } from '@dadei/ui/contexts/NotificationContext';
import { cn } from '@dadei/ui/lib/cn';
import { Check, Trash2, X } from 'lucide-react';

/** Below client tooltip (195); above main chrome. */
const PEOPLE_DRAWER_Z = 170;

interface PeoplePanelProps {
  isOpen: boolean;
  onClose: () => void;
  excludeElement?: HTMLElement | null;
}

export default function PeoplePanel({ isOpen, onClose, excludeElement }: PeoplePanelProps) {
  const { showToast } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [armedPersonDeleteId, setArmedPersonDeleteId] = useState<string | null>(null);

  // Load persons when panel opens
  useEffect(() => {
    if (isOpen) {
      loadPersons();
    }
  }, [isOpen]);

  const loadPersons = async () => {
    setLoading(true);
    try {
      const data = await personsApi.getAll();
      setPersons(data);
    } catch (error) {
      console.error('Failed to load persons:', error);
      showToast('Failed to load people', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (personId: string) => {
    if (!editName.trim()) return;

    try {
      await personsApi.update(personId, { name: editName });
      setPersons(prev => prev.map(p =>
        p.id === personId ? { ...p, name: editName } : p
      ));
      setEditingId(null);
      setEditName('');
      showToast('Person renamed successfully', 'success');
    } catch (error) {
      console.error('Failed to rename person:', error);
      showToast('Failed to rename person', 'error');
    }
  };

  const handleDeletePerson = async (personId: string) => {
    try {
      await personsApi.delete(personId);
      setPersons(prev => prev.filter(p => p.id !== personId));
      showToast('Person deleted successfully', 'success');
      setArmedPersonDeleteId(null);
    } catch (error) {
      console.error('Failed to delete person:', error);
      showToast('Failed to delete person', 'error');
      setArmedPersonDeleteId(null);
    }
  };

  useEffect(() => {
    if (!armedPersonDeleteId) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('[data-split-delete]')) return;
      setArmedPersonDeleteId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArmedPersonDeleteId(null);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [armedPersonDeleteId]);

  const startEdit = (person: Person) => {
    setEditingId(person.id);
    setEditName(person.name || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, personId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRename(personId);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  // Close on outside click (exclude toggle button)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;

      // Don't close if clicking the toggle button or inside panel
      if (
        (panelRef.current && panelRef.current.contains(target)) ||
        (excludeElement && excludeElement.contains(target))
      ) {
        return;
      }

      onClose();
    };

    // Small delay to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, excludeElement]);

  const tree = (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
            className="fixed bottom-0 right-0 top-[var(--assistant-header-h,4.75rem)] flex min-h-0 w-full max-w-md flex-col border-l border-white/10 bg-zinc-950/95 shadow-[-10px_0_40px_rgba(0,0,0,0.4)] backdrop-blur-xl will-change-transform sm:w-1/3"
            style={{ zIndex: PEOPLE_DRAWER_Z }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-100">
                <i className="fas fa-users text-emerald-400/90" />
                People
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* People List — min-h-0 so flex child can shrink and scroll */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-none p-4">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <i className="fas fa-spinner fa-spin text-2xl text-emerald-400/80" />
                </div>
              ) : persons.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <i className="fas fa-user-friends mb-3 text-4xl text-zinc-600 opacity-40" />
                  <p className="text-sm font-medium text-zinc-400">No people yet</p>
                  <p className="mt-1 text-xs text-zinc-600 font-secondary">People will appear as they speak</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {persons.map((person) => {
                    const isEditing = editingId === person.id;

                    return (
                      <div
                        key={person.id}
                        className="group/person rounded-lg border border-white/10 bg-zinc-900/70 p-3 transition-[border-color,box-shadow] duration-200 hover:border-emerald-500/25 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-950/60 text-sm font-semibold text-emerald-300">
                            {person.name ? person.name[0].toUpperCase() : person.index}
                          </div>

                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => handleNameKeyDown(e, person.id)}
                                className="w-full rounded-md border border-emerald-500/35 bg-zinc-950/80 px-2 py-1 font-sans text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                                autoFocus
                                placeholder="Enter name"
                              />
                            ) : (
                              <div>
                                <h3 className="truncate text-sm font-medium text-zinc-100 font-secondary">
                                  {person.name || `Person ${person.index}`}
                                </h3>
                                <p className="text-xs text-zinc-500 font-secondary">ID: {person.index}</p>
                              </div>
                            )}
                          </div>

                          <div
                            className={cn(
                              'flex items-center gap-1 transition-opacity',
                              armedPersonDeleteId === person.id
                                ? 'opacity-100'
                                : 'opacity-0 group-hover/person:opacity-100'
                            )}
                          >
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleRename(person.id)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-950/50 text-emerald-300 transition-colors hover:bg-emerald-950/80"
                                  title="Save"
                                >
                                  <i className="fas fa-check text-xs" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700"
                                  title="Cancel"
                                >
                                  <i className="fas fa-times text-xs" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(person)}
                                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-300"
                                  title="Rename"
                                >
                                  <i className="fas fa-pencil-alt text-xs" />
                                </button>
                                <div
                                  data-split-delete
                                  className="flex shrink-0 items-center"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <AnimatePresence mode="wait" initial={false}>
                                    {armedPersonDeleteId === person.id ? (
                                      <motion.div
                                        key="person-del-armed"
                                        initial={{ opacity: 0, x: 6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 4 }}
                                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                                        className="flex items-center gap-0.5"
                                      >
                                        <button
                                          type="button"
                                          aria-label="Confirm delete person"
                                          title="Confirm delete"
                                          onClick={e => {
                                            e.stopPropagation();
                                            void handleDeletePerson(person.id);
                                          }}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-400/95 transition-colors hover:bg-emerald-500/15"
                                        >
                                          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        </button>
                                        <button
                                          type="button"
                                          aria-label="Cancel"
                                          title="Cancel"
                                          onClick={e => {
                                            e.stopPropagation();
                                            setArmedPersonDeleteId(null);
                                          }}
                                          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200"
                                        >
                                          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                        </button>
                                      </motion.div>
                                    ) : (
                                      <motion.button
                                        key="person-del-idle"
                                        type="button"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                        title="Delete person"
                                        aria-label="Delete person"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setArmedPersonDeleteId(person.id);
                                        }}
                                        className="flex h-7 w-7 items-center justify-center rounded-md text-rose-400/90 transition-colors hover:bg-rose-950/35"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                                      </motion.button>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(tree, document.body);
}