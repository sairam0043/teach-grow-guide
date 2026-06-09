import { createContext, useContext, ReactNode } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { loginUser, registerUser, logout, googleLogin } from "@/redux/slices/authSlice";

type AppRole = "admin" | "student" | "tutor";

interface AppUser {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
}

interface AuthContextType {
  user: AppUser | null;
  session: unknown | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, meta: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  googleSignIn: (idToken: string, role?: string, action?: 'login' | 'signup') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: authUser, token, loading } = useSelector((state: RootState) => state.auth);

  let formattedUser: AppUser | null = null;
  if (authUser) {
    formattedUser = {
      id: authUser.id,
      email: authUser.email,
      user_metadata: { full_name: authUser.full_name, ...authUser }
    };
  }

  const role = authUser ? authUser.role : null;
  const session = token ? { token } : null;

  const signUp = async (email: string, password: string, meta: Record<string, string>) => {
    try {
      const resultAction = await dispatch(registerUser({ email, password, ...meta }));
      if (registerUser.fulfilled.match(resultAction)) {
        return { error: null };
      } else {
        return { error: new Error(resultAction.payload as string) };
      }
    } catch (e: any) {
      return { error: e };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const resultAction = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(resultAction)) {
        return { error: null };
      } else {
        return { error: new Error(resultAction.payload as string) };
      }
    } catch (e: any) {
      return { error: e };
    }
  };

  const googleSignIn = async (idToken: string, role?: string, action: 'login' | 'signup' = 'login') => {
    try {
      const resultAction = await dispatch(googleLogin({ idToken, role, action }));
      if (googleLogin.fulfilled.match(resultAction)) {
        return { error: null };
      } else {
        return { error: new Error(resultAction.payload as string) };
      }
    } catch (e: any) {
      return { error: e };
    }
  };

  const signOutMethod = async () => {
    dispatch(logout());
  };

  return (
    <AuthContext.Provider value={{ user: formattedUser, session, role, loading, signUp, signIn, googleSignIn, signOut: signOutMethod }}>
      {children}
    </AuthContext.Provider>
  );
};
