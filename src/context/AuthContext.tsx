import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

type AuthContextValue = {
  user: FirebaseAuthTypes.User | null;
  initializing: boolean;
  phoneVerified: boolean;
  busy: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendOtp: (phoneNumber: string) => Promise<void>;
  confirmOtp: (code: string) => Promise<void>;
  refreshPhoneVerification: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const driverDocRef = (uid: string) => firestore().collection('drivers').doc(uid);

export const AuthProvider = ({children}: {children: React.ReactNode}) => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [pendingPhone, setPendingPhone] = useState('');

  const refreshPhoneVerification = async () => {
    if (!auth().currentUser) {
      setPhoneVerified(false);
      return;
    }

    await auth().currentUser?.reload();
    const current = auth().currentUser;
    const profileDoc = await driverDocRef(current!.uid).get();
    const verifiedFromProfile = Boolean(profileDoc.data()?.phoneVerified);

    setPhoneVerified(Boolean(current?.phoneNumber) || verifiedFromProfile);
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async signedInUser => {
      setUser(signedInUser);

      if (!signedInUser) {
        setPhoneVerified(false);
        setInitializing(false);
        return;
      }

      await driverDocRef(signedInUser.uid).set(
        {
          email: signedInUser.email,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );

      await refreshPhoneVerification();

      try {
        await messaging().registerDeviceForRemoteMessages();
        const token = await messaging().getToken();
        if (token) {
          await driverDocRef(signedInUser.uid).set(
            {
              fcmToken: token,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            },
            {merge: true},
          );
        }
      } catch (error) {
        console.warn('FCM token registration skipped', error);
      }

      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setBusy(true);
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
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
      setPendingPhone(phoneNumber);
      const otpConfirmation = await current.linkWithPhoneNumber(phoneNumber.trim());
      setConfirmation(otpConfirmation);
    } finally {
      setBusy(false);
    }
  };

  const confirmOtp = async (code: string) => {
    const current = auth().currentUser;
    if (!current) {
      throw new Error('Session expired. Please sign in again.');
    }

    if (!confirmation) {
      throw new Error('Please request an OTP first.');
    }

    setBusy(true);
    try {
      await confirmation.confirm(code.trim());
      await driverDocRef(current.uid).set(
        {
          phoneNumber: pendingPhone,
          phoneVerified: true,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
      setPhoneVerified(true);
      setConfirmation(null);
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      phoneVerified,
      busy,
      signIn,
      signOut,
      sendOtp,
      confirmOtp,
      refreshPhoneVerification,
    }),
    [busy, initializing, phoneVerified, user],
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
