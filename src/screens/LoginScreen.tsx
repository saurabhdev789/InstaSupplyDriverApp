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
  const {signIn, signUp, busy} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'signIn' | 'signUp'>('signIn');

  const onSubmit = async () => {
    try {
      if (activeTab === 'signIn') {
        await signIn(email, password);
        return;
      }
      await signUp(email, password);
    } catch (error) {
      Alert.alert(activeTab === 'signIn' ? 'Sign in failed' : 'Sign up failed', (error as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      style={styles.container}>
      <Text style={styles.heading}>Driver Access</Text>
      <Text style={styles.subHeading}>Use email and password to sign in or create an account.</Text>

      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('signIn')}
          style={[styles.tab, activeTab === 'signIn' ? styles.tabActive : null]}>
          <Text style={[styles.tabText, activeTab === 'signIn' ? styles.tabTextActive : null]}>
            Sign In
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('signUp')}
          style={[styles.tab, activeTab === 'signUp' ? styles.tabActive : null]}>
          <Text style={[styles.tabText, activeTab === 'signUp' ? styles.tabTextActive : null]}>
            Sign Up
          </Text>
        </Pressable>
      </View>

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

      <Pressable disabled={busy} onPress={onSubmit} style={styles.ctaButton}>
        {busy ? (
          <ActivityIndicator color="#f8fafc" />
        ) : (
          <Text style={styles.ctaText}>{activeTab === 'signIn' ? 'Sign In' : 'Create Account'}</Text>
        )}
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
    marginBottom: 18,
    color: '#334155',
    fontSize: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#0b5fff',
  },
  tabText: {
    color: '#334155',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#f8fafc',
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
