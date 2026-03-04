import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY_ID = "infineon_currentAssessmentId";
const STORAGE_KEY_TITLE = "infineon_currentAssessmentTitle";

function loadPersistedAssessment(): { id: bigint | null; title: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ID);
    const title = localStorage.getItem(STORAGE_KEY_TITLE) ?? "";
    if (raw) {
      return { id: BigInt(raw), title };
    }
  } catch {
    // ignore parse errors
  }
  return { id: null, title: "" };
}

interface AppContextValue {
  currentAssessmentId: bigint | null;
  currentAssessmentTitle: string;
  setCurrentAssessment: (id: bigint, name: string) => void;
  clearCurrentAssessment: () => void;
  activePage: string;
  navigateTo: (page: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  activePage,
  navigateTo,
}: {
  children: ReactNode;
  activePage: string;
  navigateTo: (page: string) => void;
}) {
  const persisted = loadPersistedAssessment();
  const [currentAssessmentId, setCurrentAssessmentId] = useState<bigint | null>(
    persisted.id,
  );
  const [currentAssessmentTitle, setCurrentAssessmentTitle] = useState<string>(
    persisted.title,
  );

  // Sync to localStorage whenever the current assessment changes
  useEffect(() => {
    if (currentAssessmentId != null) {
      localStorage.setItem(STORAGE_KEY_ID, String(currentAssessmentId));
      localStorage.setItem(STORAGE_KEY_TITLE, currentAssessmentTitle);
    } else {
      localStorage.removeItem(STORAGE_KEY_ID);
      localStorage.removeItem(STORAGE_KEY_TITLE);
    }
  }, [currentAssessmentId, currentAssessmentTitle]);

  function setCurrentAssessment(id: bigint, name: string) {
    setCurrentAssessmentId(id);
    setCurrentAssessmentTitle(name);
  }

  function clearCurrentAssessment() {
    setCurrentAssessmentId(null);
    setCurrentAssessmentTitle("");
  }

  return (
    <AppContext.Provider
      value={{
        currentAssessmentId,
        currentAssessmentTitle,
        setCurrentAssessment,
        clearCurrentAssessment,
        activePage,
        navigateTo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
