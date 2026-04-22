import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

          window.clearTimeout(loadingTimeout);
          setUser(currentUser);

          if (currentUser) {
            const userRef = firestore.doc(db, 'users', currentUser.uid);
            try {
              const userSnap = await firestore.getDoc(userRef);
              if (!userSnap.exists()) {
                const isDefaultAdmin = isBootstrapAdminEmail(currentUser.email, currentUser.emailVerified);
                await firestore.setDoc(userRef, {
                  name: currentUser.displayName || 'Patient',
                  email: currentUser.email || '',
                  ...(currentUser.phoneNumber ? { phone: currentUser.phoneNumber } : {}),
                  role: isDefaultAdmin ? 'admin' : 'client',
                  createdAt: firestore.serverTimestamp()
                });
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

                  if (isMounted) {
                    setRole(nextRole);
                  }
                },
                (roleError) => {
                  console.error('Error subscribing to user role:', roleError);
                  if (isMounted) {
                    setRole('client');
                  }
                }
              );
            } catch (error) {
              console.error('Error creating user document:', error);
              if (isMounted) {
                setRole('client');
              }
            }
          } else {
            unsubscribeRole?.();
            unsubscribeRole = null;
            setRole(null);
          }

          setLoading(false);
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
      const [{ signInWithPopup, GoogleAuthProvider }, { auth }] = await Promise.all([
        import('firebase/auth'),
        import('../firebase-auth'),
      ]);
      const storedProvider = (window as Window & { __ambGoogleAuthProvider?: InstanceType<typeof GoogleAuthProvider> }).__ambGoogleAuthProvider;
      const provider = storedProvider ?? new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success(feedback.successMessage);
    } catch (error: any) {
      console.error('Error signing in with Google', error);
      toast.error(error.message || feedback.errorMessage);
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
