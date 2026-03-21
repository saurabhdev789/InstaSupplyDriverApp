import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {useAuth} from '../context/AuthContext';

export const PhoneVerificationScreen = () => {
  const {busy, sendOtp, confirmOtp} = useAuth();
  const [phone, setPhone] = useState('+919876543210');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const onSendOtp = async () => {
    try {
      await sendOtp(phone);
      setOtpSent(true);
      Alert.alert('OTP Sent', 'Enter the verification code received on your phone.');
    } catch (error) {
      Alert.alert('Could not send OTP', (error as Error).message);
    }
  };

  const onVerifyOtp = async () => {
    try {
      await confirmOtp(otp);
      Alert.alert('Verified', 'Phone number verification completed.');
    } catch (error) {
      Alert.alert('Verification failed', (error as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <Text style={styles.heading}>Verify Mobile Number</Text>
      <Text style={styles.subHeading}>
        OTP verification is required before accessing deliveries.
      </Text>

      <TextInput
        keyboardType="phone-pad"
        onChangeText={setPhone}
        placeholder="+91XXXXXXXXXX"
        placeholderTextColor="#7d8ca5"
        style={styles.input}
        value={phone}
      />
      <Pressable disabled={busy} onPress={onSendOtp} style={styles.ctaButton}>
        {busy ? <ActivityIndicator color="#f8fafc" /> : <Text style={styles.ctaText}>Send OTP</Text>}
      </Pressable>

      {otpSent ? (
        <View style={styles.otpContainer}>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setOtp}
            placeholder="6-digit OTP"
            placeholderTextColor="#7d8ca5"
            style={styles.input}
            value={otp}
          />
          <Pressable disabled={busy} onPress={onVerifyOtp} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Verify OTP</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#f7fafc',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subHeading: {
    marginTop: 8,
    marginBottom: 24,
    color: '#334155',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  ctaButton: {
    marginTop: 4,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b5fff',
  },
  ctaText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 16,
  },
  otpContainer: {
    marginTop: 18,
  },
  secondaryButton: {
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  secondaryText: {
    color: '#f8fafc',
    fontWeight: '700',
  },
});

