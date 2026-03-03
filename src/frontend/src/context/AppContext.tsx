import { type ReactNode, createContext, useContext, useState } from "react";

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
  const [currentAssessmentId, setCurrentAssessmentId] = useState<bigint | null>(
    null,
  );
  const [currentAssessmentTitle, setCurrentAssessmentTitle] =
    useState<string>("");

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
