import {
  type UserRole,
  changeUserPassword,
  getSavedSessionToken,
  getSessionUser,
  loginUser,
  logoutUser,
  registerUser,
  seedAdminUser,
} from "@/utils/authStorage";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export interface AuthUser {
  userId: string;
  username: string;
  role: UserRole;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  sessionToken: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (username: string, password: string) => { ok: true } | { err: string };
  logout: () => void;
  register: (
    username: string,
    password: string,
  ) => { ok: true } | { err: string };
  changePassword: (
    oldPassword: string,
    newPassword: string,
  ) => { ok: true } | { err: string };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // On mount: seed admin and restore session
  useEffect(() => {
    seedAdminUser();
    const savedToken = getSavedSessionToken();
    if (savedToken) {
      const user = getSessionUser(savedToken);
      if (user) {
        setSessionToken(savedToken);
        setCurrentUser(user);
      }
    }
    setIsInitializing(false);
  }, []);

  function login(
    username: string,
    password: string,
  ): { ok: true } | { err: string } {
    const result = loginUser(username, password);
    if ("err" in result) return result;
    const { token, userId, role } = result.ok;
    setSessionToken(token);
    setCurrentUser({ userId, username: result.ok.username, role });
    return { ok: true };
  }

  function logout(): void {
    if (sessionToken) logoutUser(sessionToken);
    setSessionToken(null);
    setCurrentUser(null);
  }

  function register(
    username: string,
    password: string,
  ): { ok: true } | { err: string } {
    const result = registerUser(username, password);
    if ("err" in result) return result;
    // Auto-login after registration
    return login(username, password);
  }

  function changePasswordFn(
    oldPassword: string,
    newPassword: string,
  ): { ok: true } | { err: string } {
    if (!sessionToken) return { err: "Not authenticated" };
    return changeUserPassword(sessionToken, oldPassword, newPassword);
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        sessionToken,
        isAdmin: currentUser?.role === "admin",
        isAuthenticated: currentUser !== null,
        isInitializing,
        login,
        logout,
        register,
        changePassword: changePasswordFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
