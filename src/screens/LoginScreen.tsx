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

export const LoginScreen = () => {
  const {signIn, busy} = useAuth();
  const [email, setEmail] = useState('driver@instasupply.ca');
  const [password, setPassword] = useState('Driver@123');

  const onSignIn = async () => {
    try {
      await signIn(email, password);
    } catch (error) {
      Alert.alert('Sign in failed', (error as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <Text style={styles.heading}>Driver Login</Text>
      <Text style={styles.subHeading}>Use Firebase email and password credentials.</Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#7d8ca5"
        style={styles.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#7d8ca5"
        secureTextEntry
        style={styles.input}
        value={password}
      />

      <Pressable disabled={busy} onPress={onSignIn} style={styles.ctaButton}>
        {busy ? <ActivityIndicator color="#f8fafc" /> : <Text style={styles.ctaText}>Sign In</Text>}
      </Pressable>
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
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
  },
  subHeading: {
    marginTop: 8,
    marginBottom: 28,
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
    marginTop: 8,
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
});

