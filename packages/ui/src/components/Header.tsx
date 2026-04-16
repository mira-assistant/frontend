
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@mira/ui/hooks/useAuth';
import { useService } from '@mira/ui/hooks/useService';
import { serviceApi } from '@mira/ui/lib/api/service';
import Tooltip from '@mira/ui/components/ui/Tooltip';
import PeoplePanel from '@mira/ui/components/PeoplePanel';
import { cn } from '@mira/ui/lib/cn';
import { setStoredClientName } from '@mira/ui/lib/clientNameStorage';

interface HeaderProps {
  isPeoplePanelOpen: boolean;
  setIsPeoplePanelOpen: (open: boolean) => void;
}

export default function Header({ isPeoplePanelOpen, setIsPeoplePanelOpen }: HeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { clientName, setClientName, registrationConflict } = useService();
  const peopleButtonRef = useRef<HTMLButtonElement>(null);

  const [inputValue, setInputValue] = useState(clientName);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Cache client list to avoid repeated API calls
  const clientListCache = useRef<string[]>([]);
  const cacheTimestamp = useRef<number>(0);
  const CACHE_DURATION = 30000; // 30 seconds

  // Debounce timer
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const latestCheckId = useRef(0);

  useEffect(() => {
    setInputValue(clientName);
  }, [clientName]);

  // Fetch client list (with caching)
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

  // Check if client name is available
  const checkAvailability = useCallback(async (name: string, forceRefresh = false): Promise<boolean | null> => {
    if (!name || name.trim() === '') {
      setIsAvailable(null);
      setShowTooltip(false);
      return null;
    }

    // Don't check if it's the current name
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
      setShowTooltip(true); // Show tooltip with result
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

  // Handle input change with proper debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setInputValue(value);
    latestCheckId.current += 1;
    setIsChecking(false);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Hide tooltip while typing
    setShowTooltip(false);
    setIsAvailable(null);

    // Set new debounced check
    debounceTimer.current = setTimeout(() => {
      void checkAvailability(value);
    }, 500);
  };

  // Cleanup debounce timer on unmount
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
      setShowTooltip(false); // Hide tooltip when saving

      try {
        await serviceApi.renameClient(clientName, newName);

        if (window.electronAPI) {
          await window.electronAPI.storeClientName(newName);
        } else {
          setStoredClientName(newName);
        }

        setClientName(newName);
        setIsAvailable(null);

        // Invalidate cache
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

  // Determine border color based on availability / registration conflict
  const getBorderColor = () => {
    if (registrationConflict) return 'border-red-500';
    if (isChecking) return 'border-yellow-400';
    if (isAvailable === false) return 'border-red-500';
    if (isAvailable === true && inputValue !== clientName) return 'border-green-500';
    return 'border-[#80ffdb]';
  };

  // Determine tooltip content and variant
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
    <header className="flex items-center justify-between px-6 py-4 bg-linear-to-r from-[#f0fffa] to-[#e6fffa] border-b border-[#80ffdb] shadow-[0_2px_10px_rgba(0,255,136,0.1)]">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 text-2xl font-semibold text-[#00cc6a] transition-opacity hover:opacity-85"
          title="Home"
        >
          <i className="fas fa-microphone-alt" />
          Mira
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {/* Client Name Input */}
        <div className="flex items-center gap-2">
          <label htmlFor="clientName" className="text-sm font-semibold text-[#00cc6a]">
            Client Name:
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
                className={`w-[140px] px-2.5 py-1.5 text-sm text-center text-gray-900 bg-[#f0fffa] border-2 ${getBorderColor()} rounded-xl transition-all duration-300 focus:outline-none focus:bg-white disabled:opacity-50 disabled:cursor-not-allowed`}
              />
              {isChecking && (
                <i className="fas fa-spinner fa-spin absolute right-2 top-1/2 -translate-y-1/2 text-yellow-500 text-xs" />
              )}
              {isRegistering && (
                <i className="fas fa-spinner fa-spin absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 text-xs" />
              )}
            </div>
          </Tooltip>
        </div>

        {/* People Button */}
        <button
          ref={peopleButtonRef}
          onClick={() => setIsPeoplePanelOpen(!isPeoplePanelOpen)}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border border-green-300 transition-colors duration-200",
            isPeoplePanelOpen
              ? "text-green-600 bg-green-100 hover:border-green-400"
              : "text-green-400 bg-white/50 hover:bg-green-100 hover:border-green-400 hover:text-green-600"
          )}
          title="People"
        >
          <i className="fas fa-users text-sm" />
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/50 border border-[#e5e7eb] text-red-400 transition-colors duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          title="Logout"
        >
          <i className="fas fa-sign-out-alt text-sm" />
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