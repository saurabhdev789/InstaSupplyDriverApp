import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

type AuthContextValue = {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  phoneVerified: boolean;
  busy: boolean;
  authAction: 'signIn' | 'signUp' | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<void>;
  confirmOtp: (code: string) => Promise<void>;
  refreshPhoneVerification: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const driverDocRef = (uid: string) => firestore().collection('drivers').doc(uid);
const OTP_TIMEOUT_MS = 25000;
const BOOTSTRAP_TIMEOUT_MS = 6000;
const TOKEN_TIMEOUT_MS = 8000;
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

const withTimeout = async <T,>(
  promise: Promise<T>,
  label: string,
  timeoutMs = OTP_TIMEOUT_MS,
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${label} timed out. Please try again.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

const normalizePhoneNumber = (value: string): string => {
  const trimmed = value.trim();
  const normalizedPlus = trimmed.replace(/^\s*00/, '+');
  const withoutFormatting = normalizedPlus.replace(/[()\-\s]/g, '');

  if (withoutFormatting.startsWith('+')) {
    return withoutFormatting;
  }

  if (/^\d{10}$/.test(withoutFormatting)) {
    return `+91${withoutFormatting}`;
  }

  return withoutFormatting;
};

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authAction, setAuthAction] = useState<'signIn' | 'signUp' | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState('');

  const refreshPhoneVerification = async () => {
    if (!auth().currentUser) {
      setPhoneVerified(false);
      return false;
    }

    const current = auth().currentUser;
    if (!current) {
      setPhoneVerified(false);
      return false;
    }

    const profileReference = driverDocRef(current.uid);
    const profileDoc = await withTimeout(
      profileReference.get(),
      'Fetching phone verification',
      BOOTSTRAP_TIMEOUT_MS,
    ).catch(() => null);
    const verifiedFromProfile = Boolean(profileDoc?.data()?.phoneVerified);
    const finalVerified = verifiedFromProfile;

    if (profileDoc && !profileDoc.exists) {
      void profileReference
        .set(
          {
            email: current.email,
            phoneVerified: finalVerified,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        )
        .catch(error => {
          console.warn('Driver profile bootstrap failed', error);
        });
    }

    setPhoneVerified(finalVerified);
    return finalVerified;
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async signedInUser => {
      try {
        setUser(signedInUser);

        if (!signedInUser) {
          setPhoneVerified(false);
          setAuthAction(null);
          return;
        }

        const verified = await withTimeout(
          refreshPhoneVerification(),
          'Session restore',
          BOOTSTRAP_TIMEOUT_MS,
        ).catch(() => false);
        setPhoneVerified(verified);

        void driverDocRef(signedInUser.uid)
          .set(
            {
              email: signedInUser.email,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
          )
          .catch(error => {
            console.warn('Driver profile update skipped', error);
          });

        void (async () => {
          await withTimeout(
            messaging().registerDeviceForRemoteMessages(),
            'Registering remote messages',
            TOKEN_TIMEOUT_MS,
          );
          const token = await withTimeout(
            messaging().getToken(),
            'Fetching FCM token',
            TOKEN_TIMEOUT_MS,
          );
          if (token) {
            await driverDocRef(signedInUser.uid).set(
              {
                fcmToken: token,
                updatedAt: firestore.FieldValue.serverTimestamp(),
              },
              {merge: true},
            );
          }
        })().catch(error => {
          console.warn('FCM token registration skipped', error);
        });
      } catch (error) {
        const authErrorCode = (error as {code?: string})?.code ?? '';
        const shouldResetSession =
          authErrorCode.includes('user-not-found') ||
          authErrorCode.includes('invalid-user-token') ||
          authErrorCode.includes('user-token-expired');

        if (shouldResetSession) {
          try {
            await auth().signOut();
          } catch (signOutError) {
            console.warn('Session reset failed', signOutError);
          }
          setUser(null);
          setPhoneVerified(false);
          setAuthAction(null);
        }

        console.warn('Auth state initialization failed', error);
      } finally {
        setInitializing(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setBusy(true);
    try {
      setAuthAction('signIn');
      await auth().signInWithEmailAndPassword(email.trim(), password);
    } finally {
      setBusy(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setBusy(true);
    try {
      setAuthAction('signUp');
      const credentials = await auth().createUserWithEmailAndPassword(email.trim(), password);
      await driverDocRef(credentials.user.uid).set(
        {
          email: credentials.user.email,
          phoneVerified: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await auth().signOut();
  };

  const sendOtp = async (phoneNumber: string) => {
    const current = auth().currentUser;
    if (!current) {
      throw new Error('Please sign in first.');
    }

    if (current.phoneNumber) {
      setPhoneVerified(true);
      return;
    }

    setBusy(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber);
      if (!E164_REGEX.test(normalizedPhone)) {
        throw new Error(
          'Invalid phone format. Use E.164 format like +919988737878 (or enter 10 digits and we will auto-add +91).',
        );
      }
      setPendingPhone(normalizedPhone);

      const listener = auth().verifyPhoneNumber(normalizedPhone);

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        listener.on(
          'state_changed',
          snapshot => {
            if (settled) {
              return;
            }

            if (snapshot.state === auth.PhoneAuthState.CODE_SENT) {
              setVerificationId(snapshot.verificationId);
              settled = true;
              resolve();
            }

            if (snapshot.state === auth.PhoneAuthState.ERROR) {
              settled = true;
              reject(new Error(snapshot.error?.message ?? 'Failed to send OTP.'));
            }
          },
          error => {
            if (!settled) {
              settled = true;
              reject(error);
            }
          },
        );
      });
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async (code: string) => {
    console.log('[confirmOtp] start');
    const current = auth().currentUser;
    console.log('[confirmOtp] current user uid:', current?.uid ?? 'null');
    console.log('[confirmOtp] verificationId present:', Boolean(verificationId));
    console.log('[confirmOtp] pendingPhone present:', Boolean(pendingPhone));
    console.log('[confirmOtp] otp length:', code?.trim()?.length ?? 0);

    if (!current) {
      console.log('[confirmOtp] abort: no authenticated user');
      throw new Error('Session expired. Please sign in again.');
    }

    if (!verificationId) {
      console.log('[confirmOtp] abort: missing verificationId');
      throw new Error('Please request an OTP first.');
    }

    setBusy(true);
    try {
      console.log('[confirmOtp] busy=true');
      if (current.phoneNumber) {
        console.log('[confirmOtp] user already has phoneNumber:', current.phoneNumber);
        console.log('[confirmOtp] writing phoneVerified=true to Firestore');
        await withTimeout(
          driverDocRef(current.uid).set(
            {
              phoneNumber: current.phoneNumber,
              phoneVerified: true,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
          ),
          'Saving phone verification',
        );
        console.log('[confirmOtp] Firestore update success (already linked)');
        setPhoneVerified(true);
        setVerificationId(null);
        console.log('[confirmOtp] phoneVerified set true, verificationId cleared');
        return;
      }

      console.log('[confirmOtp] creating phone credential');
      const credential = auth.PhoneAuthProvider.credential(verificationId, code.trim());
      console.log('[confirmOtp] linking credential with current user');
      await withTimeout(current.linkWithCredential(credential), 'OTP verification');
      console.log('[confirmOtp] linkWithCredential success');
      console.log('[confirmOtp] writing verified phone to Firestore:', pendingPhone);
      const result = await withTimeout(
        driverDocRef(current.uid).set(
          {
            phoneNumber: pendingPhone,
            phoneVerified: true,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        ),
        'Saving phone verification',
      );
      console.log('[confirmOtp] Firestore update success', result);
      setPhoneVerified(true);
      setVerificationId(null);
      console.log('[confirmOtp] complete: phoneVerified=true, verificationId cleared');
    } catch (error) {
      const typedError = error as {code?: string; message?: string};
      console.log('[confirmOtp] error code:', typedError?.code ?? 'unknown');
      console.log('[confirmOtp] error message:', typedError?.message ?? 'unknown');
      throw error;
    } finally {
      setBusy(false);
      console.log('[confirmOtp] busy=false (finally)');
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      phoneVerified,
      busy,
      authAction,
      signIn,
      signUp,
      signOut,
      sendOtp,
      confirmOtp,
      refreshPhoneVerification,
    }),
    [authAction, busy, initializing, phoneVerified, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};
