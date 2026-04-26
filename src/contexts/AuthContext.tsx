import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import toast from 'react-hot-toast';
import { isBootstrapAdminEmail } from '../config/admin';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  signInWithGoogle: (feedback: AuthFeedbackCopy) => Promise<void>;
  logout: (feedback: AuthFeedbackCopy) => Promise<void>;
}

interface AuthFeedbackCopy {
  successMessage: string;
  errorMessage: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function shouldPreferRedirectSignIn() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(max-width: 768px)').matches;
}

function getAuthErrorMessage(error: unknown, fallbackMessage: string) {
  const message =
    typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
      ? error.message
      : fallbackMessage;
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';

  if (code === 'auth/popup-blocked') {
    return 'Google sign-in was blocked by the browser. We are switching to a full-page sign-in instead.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was closed before it finished. Please try again when you are ready.';
  }

  if (code === 'auth/network-request-failed') {
    return 'We could not reach Google sign-in. Please check your connection and try again.';
  }

  if (code === 'auth/cancelled-popup-request') {
    return 'A sign-in window is already open. Please finish that window or try again in a moment.';
  }

  return message || fallbackMessage;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const authEventVersionRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeRole: (() => void) | null = null;
    const loadingTimeout = window.setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization timed out, rendering app shell without waiting longer.');
        setLoading(false);
      }
    }, 3500);

    void (async () => {
      try {
        const [{ GoogleAuthProvider, onAuthStateChanged }, firestore, { auth }, { db }] = await Promise.all([
          import('firebase/auth'),
          import('firebase/firestore'),
          import('../firebase-auth'),
          import('../firebase-db'),
        ]);

        if (!isMounted) {
          return;
        }

        unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
          if (!isMounted) return;
          const authEventVersion = ++authEventVersionRef.current;
          const isCurrentAuthEvent = () => isMounted && authEventVersionRef.current === authEventVersion;

          window.clearTimeout(loadingTimeout);
          setUser(currentUser);

          if (currentUser) {
            setRole(isBootstrapAdminEmail(currentUser.email, currentUser.emailVerified) ? 'admin' : null);
            const userRef = firestore.doc(db, 'users', currentUser.uid);
            try {
              const userSnap = await firestore.getDoc(userRef);
              if (!isCurrentAuthEvent()) {
                return;
              }

              if (!userSnap.exists()) {
                const isDefaultAdmin = isBootstrapAdminEmail(currentUser.email, currentUser.emailVerified);
                await firestore.setDoc(userRef, {
                  name: currentUser.displayName || 'Client',
                  email: currentUser.email || '',
                  ...(currentUser.phoneNumber ? { phone: currentUser.phoneNumber } : {}),
                  role: isDefaultAdmin ? 'admin' : 'client',
                  createdAt: firestore.serverTimestamp()
                });
              }

              if (!isCurrentAuthEvent()) {
                return;
              }

              unsubscribeRole?.();
              unsubscribeRole = firestore.onSnapshot(
                userRef,
                (roleSnap) => {
                  const isDefaultAdmin = isBootstrapAdminEmail(currentUser.email, currentUser.emailVerified);
                  const nextRole = isDefaultAdmin
                    ? 'admin'
                    : roleSnap.exists()
                      ? (roleSnap.data().role || 'client')
                      : 'client';

                  if (isCurrentAuthEvent()) {
                    setRole(nextRole);
                  }
                },
                (roleError) => {
                  console.error('Error subscribing to user role:', roleError);
                  if (isCurrentAuthEvent()) {
                    setRole(isBootstrapAdminEmail(currentUser.email, currentUser.emailVerified) ? 'admin' : 'client');
                  }
                }
              );
            } catch (error) {
              console.error('Error creating user document:', error);
              if (isCurrentAuthEvent()) {
                setRole(isBootstrapAdminEmail(currentUser.email, currentUser.emailVerified) ? 'admin' : 'client');
              }
            }
          } else {
            unsubscribeRole?.();
            unsubscribeRole = null;
            setRole(null);
          }

          if (isCurrentAuthEvent()) {
            setLoading(false);
          }
        });

        (window as Window & { __ambGoogleAuthProvider?: InstanceType<typeof GoogleAuthProvider> }).__ambGoogleAuthProvider = new GoogleAuthProvider();
      } catch (error) {
        console.error('Error preparing auth context:', error);
        if (isMounted) {
          setLoading(false);
          setRole(null);
        }
      }
    })();

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimeout);
      unsubscribeRole?.();
      unsubscribeAuth?.();
    };
  }, []);

  const signInWithGoogle = async (feedback: AuthFeedbackCopy) => {
    try {
      const [{ signInWithPopup, signInWithRedirect, GoogleAuthProvider }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../firebase-auth'),
      ]);
      const storedProvider = (window as Window & { __ambGoogleAuthProvider?: InstanceType<typeof GoogleAuthProvider> }).__ambGoogleAuthProvider;
      const provider = storedProvider ?? new GoogleAuthProvider();
      if (shouldPreferRedirectSignIn()) {
        await signInWithRedirect(auth, provider);
        return;
      }

      await signInWithPopup(auth, provider);
      toast.success(feedback.successMessage);
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      const [{ signInWithRedirect, GoogleAuthProvider }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../firebase-auth'),
      ]);

      const storedProvider = (window as Window & { __ambGoogleAuthProvider?: InstanceType<typeof GoogleAuthProvider> }).__ambGoogleAuthProvider;
      const provider = storedProvider ?? new GoogleAuthProvider();

      if (error?.code === 'auth/popup-blocked') {
        toast(getAuthErrorMessage(error, feedback.errorMessage), { icon: 'i' });
        await signInWithRedirect(auth, provider);
        return;
      }

      toast.error(getAuthErrorMessage(error, feedback.errorMessage));
    }
  };

  const logout = async (feedback: AuthFeedbackCopy) => {
    try {
      const [{ signOut }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../firebase-auth'),
      ]);
      await signOut(auth);
      toast.success(feedback.successMessage);
    } catch (error: any) {
      console.error('Error signing out', error);
      toast.error(feedback.errorMessage);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
