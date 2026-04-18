
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, LogOut, Users } from 'lucide-react';
import { useAuth } from '@dadei/ui/contexts/AuthContext';
import { useService } from '@dadei/ui/contexts/ServiceContext';
import { serviceApi } from '@dadei/ui/lib/api/service';
import Tooltip from '@dadei/ui/components/ui/Tooltip';
import PeoplePanel from '@dadei/ui/components/PeoplePanel';
import { cn } from '@dadei/ui/lib/cn';
import { setStoredClientName } from '@dadei/ui/lib/clientNameStorage';
import logoUrl from '../assets/logo.png';

interface HeaderProps {
  isPeoplePanelOpen: boolean;
  setIsPeoplePanelOpen: (open: boolean) => void;
  onOpenSettings: () => void;
}

export default function Header({
  isPeoplePanelOpen,
  setIsPeoplePanelOpen,
  onOpenSettings,
}: HeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { clientName, setClientName, registrationConflict } = useService();
  const peopleButtonRef = useRef<HTMLButtonElement>(null);

  const [inputValue, setInputValue] = useState(clientName);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const clientListCache = useRef<string[]>([]);
  const cacheTimestamp = useRef<number>(0);
  const CACHE_DURATION = 30000;

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const latestCheckId = useRef(0);

  useEffect(() => {
    setInputValue(clientName);
  }, [clientName]);

  const fetchClientList = useCallback(async (forceRefresh = false): Promise<string[]> => {
    const now = Date.now();

    if (!forceRefresh && now - cacheTimestamp.current < CACHE_DURATION && clientListCache.current.length > 0) {
      return clientListCache.current;
    }

    try {
      const response = await serviceApi.listClients();
      clientListCache.current = response;
      cacheTimestamp.current = now;
      return response;
    } catch (error) {
      console.error('Failed to fetch client list:', error);
      return clientListCache.current;
    }
  }, []);

  const checkAvailability = useCallback(async (name: string, forceRefresh = false): Promise<boolean | null> => {
    if (!name || name.trim() === '') {
      setIsAvailable(null);
      setShowTooltip(false);
      return null;
    }

    if (name === clientName) {
      setIsAvailable(null);
      setShowTooltip(false);
      return null;
    }

    setIsChecking(true);
    const checkId = ++latestCheckId.current;

    try {
      const existingClients = await fetchClientList(forceRefresh);
      const available = !existingClients.includes(name);
      if (checkId !== latestCheckId.current) {
        return null;
      }
      setIsAvailable(available);
      setShowTooltip(true);
      return available;
    } catch (error) {
      console.error('Failed to check client name availability:', error);
      if (checkId !== latestCheckId.current) {
        return null;
      }
      setIsAvailable(null);
      setShowTooltip(false);
      return null;
    } finally {
      if (checkId === latestCheckId.current) {
        setIsChecking(false);
      }
    }
  }, [clientName, fetchClientList]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setInputValue(value);
    latestCheckId.current += 1;
    setIsChecking(false);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setShowTooltip(false);
    setIsAvailable(null);

    debounceTimer.current = setTimeout(() => {
      void checkAvailability(value);
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const newName = inputValue.trim();

      if (!newName) return;
      if (newName === clientName) return;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      const availability = await checkAvailability(newName, true);
      if (availability !== true) return;

      setIsRegistering(true);
      setShowTooltip(false);

      try {
        await serviceApi.renameClient(clientName, newName);

        if (window.electronAPI) {
          await window.electronAPI.storeClientName(newName);
        } else {
          setStoredClientName(newName);
        }

        setClientName(newName);
        setIsAvailable(null);

        clientListCache.current = [];
        cacheTimestamp.current = 0;

        console.log(`Client renamed to: ${newName}`);
      } catch (error) {
        console.error('Failed to update client name:', error);
        setInputValue(clientName);
      } finally {
        setIsRegistering(false);
      }
    }
  };

  const getBorderColor = () => {
    if (registrationConflict) return 'border-red-500/70';
    if (isChecking) return 'border-amber-400/70';
    if (isAvailable === false) return 'border-red-500/70';
    if (isAvailable === true && inputValue !== clientName) return 'border-emerald-500/70';
    return 'border-emerald-500/35';
  };

  const getTooltipContent = () => {
    if (registrationConflict) return 'Not registered — name in use';
    if (isAvailable === true) return 'Available';
    if (isAvailable === false) return 'Taken';
    return '';
  };

  const getTooltipVariant = (): 'success' | 'error' => {
    if (registrationConflict) return 'error';
    return isAvailable === true ? 'success' : 'error';
  };

  return (
    <header
      className="relative z-20 flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-zinc-950/55 px-6 py-4 backdrop-blur-md"
      style={{ minHeight: 'var(--assistant-header-h, 4.75rem)' }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-emerald-400/95">
          <img src={logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-white/10" />
          <span className="hidden font-brand sm:inline">dadei</span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2">
          <label
            htmlFor="clientName"
            className="hidden text-sm font-semibold text-emerald-500/90 sm:inline font-secondary"
          >
            Client
          </label>
          <Tooltip
            content={getTooltipContent()}
            variant={getTooltipVariant()}
            show={registrationConflict || (showTooltip && isAvailable !== null)}
            position="bottom"
          >
            <div className="relative">
              <input
                id="clientName"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isRegistering}
                maxLength={50}
                placeholder="web-client"
                className={cn(
                  'w-[120px] rounded-xl border-2 bg-zinc-900/80 px-2.5 py-1.5 text-center font-sans text-sm text-zinc-100 shadow-inner shadow-black/20 transition-all duration-300 placeholder:text-zinc-600 focus:bg-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-[140px]',
                  getBorderColor()
                )}
              />
              {isChecking && (
                <span className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-amber-400/40 border-t-amber-400" />
              )}
              {isRegistering && (
                <span className="absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-sky-400/40 border-t-sky-400" />
              )}
            </div>
          </Tooltip>
        </div>

        <button
          ref={peopleButtonRef}
          type="button"
          onClick={() => setIsPeoplePanelOpen(!isPeoplePanelOpen)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-200',
            isPeoplePanelOpen
              ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300'
              : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-emerald-500/30 hover:bg-zinc-800/80 hover:text-emerald-300/90'
          )}
          title="People"
        >
          <Users className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/60 text-zinc-400 transition-colors hover:border-emerald-500/30 hover:text-emerald-300/90"
          title="Settings"
        >
          <Settings2 className="h-4 w-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/60 text-rose-400/90 transition-colors hover:border-rose-500/35 hover:bg-rose-950/40 hover:text-rose-300"
          title="Logout"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
        </button>

        <PeoplePanel
          isOpen={isPeoplePanelOpen}
          onClose={() => setIsPeoplePanelOpen(false)}
          excludeElement={peopleButtonRef.current}
        />
      </div>
    </header>
  );
}
