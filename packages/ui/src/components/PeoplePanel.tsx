
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { personsApi } from '@dadei/ui/lib/api/persons';
import { Person } from '@dadei/ui/types/models.types';
import { useToast } from '@dadei/ui/contexts/ToastContext';
import Modal from '@dadei/ui/components/ui/Modal';

interface PeoplePanelProps {
  isOpen: boolean;
  onClose: () => void;
  excludeElement?: HTMLElement | null;
}

export default function PeoplePanel({ isOpen, onClose, excludeElement }: PeoplePanelProps) {
  const { showToast } = useToast();
  const panelRef = useRef<HTMLDivElement>(null);

  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<string | null>(null);

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

  const confirmDelete = (personId: string) => {
    setPersonToDelete(personId);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!personToDelete) return;

    try {
      await personsApi.delete(personToDelete);
      setPersons(prev => prev.filter(p => p.id !== personToDelete));
      showToast('Person deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete person:', error);
      showToast('Failed to delete person', 'error');
    } finally {
      setPersonToDelete(null);
    }
  };

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

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.34, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-[73px] right-0 bottom-0 z-40 flex w-1/3 max-w-md transform-[translateZ(0)] flex-col border-l border-[#e5e7eb] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.06)] will-change-transform"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb]">
              <h2 className="text-lg font-semibold text-[#1f2937] flex items-center gap-2">
                <i className="fas fa-users text-[#00cc6a]" />
                People
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-[#6b7280]"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* People List */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <i className="fas fa-spinner fa-spin text-2xl text-[#00cc6a]" />
                </div>
              ) : persons.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <i className="fas fa-user-friends text-4xl text-[#9ca3af] opacity-30 mb-3" />
                  <p className="text-sm font-medium text-[#6b7280]">No people yet</p>
                  <p className="text-xs text-[#9ca3af] mt-1">People will appear as they speak</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {persons.map((person) => {
                    const isEditing = editingId === person.id;

                    return (
                      <div
                        key={person.id}
                        className="group rounded-lg border border-[#e5e7eb] bg-white p-3 transition-[border-color,box-shadow] duration-200 hover:border-[#80ffdb] hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-linear-to-br from-[#e6fffa] to-[#ccffee] text-[#00cc6a] font-semibold text-sm shrink-0">
                            {person.name ? person.name[0].toUpperCase() : person.index}
                          </div>

                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => handleNameKeyDown(e, person.id)}
                                className="w-full px-2 py-1 text-sm border border-[#80ffdb] rounded-md focus:outline-none focus:ring-2 focus:ring-[#00ff88]/30"
                                autoFocus
                                placeholder="Enter name"
                              />
                            ) : (
                              <div>
                                <h3 className="text-sm font-medium text-[#1f2937] truncate">
                                  {person.name || `Person ${person.index}`}
                                </h3>
                                <p className="text-xs text-[#9ca3af]">ID: {person.index}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleRename(person.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-[#e6fffa] text-[#00cc6a] hover:bg-[#ccffee] transition-colors"
                                  title="Save"
                                >
                                  <i className="fas fa-check text-xs" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                  title="Cancel"
                                >
                                  <i className="fas fa-times text-xs" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(person)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600 transition-colors"
                                  title="Rename"
                                >
                                  <i className="fas fa-pencil-alt text-xs" />
                                </button>
                                <button
                                  onClick={() => confirmDelete(person.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500 transition-colors"
                                  title="Delete"
                                >
                                  <i className="fas fa-trash text-xs" />
                                </button>
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

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Person"
        message="Are you sure you want to delete this person? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}