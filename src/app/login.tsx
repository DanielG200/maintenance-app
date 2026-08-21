import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { supabase } from '@/utils/supabase';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        'Missing information',
        'Please enter your email and password.'
      );
      return;
    }

    try {
      setLoading(true);

      if (isSignUp) {
        const { data, error } =
          await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
            emailRedirectTo: 'maintenanceapp://auth/callback',
            },
          });

        if (error) {
          throw error;
        }

        if (!data.session) {
          Alert.alert(
            'Check your email',
            'Your account was created. Check your email to verify your account.'
          );
          return;
        }

        router.replace('/home');
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (error) {
          throw error;
        }

        router.replace('/home');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);

      Alert.alert(
        'Authentication Error',
        error?.message || 'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.icon}>🔧</Text>

            <Text style={styles.title}>
              Maintenance
            </Text>

            <Text style={styles.subtitle}>
              Keep your items in good shape.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.heading}>
              {isSignUp
                ? 'Create an account'
                : 'Welcome back'}
            </Text>

            <Text style={styles.description}>
              {isSignUp
                ? 'Create an account to save and sync your items.'
                : 'Sign in to access your maintenance items.'}
            </Text>

            <Text style={styles.label}>
              Email
            </Text>

            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#9A9DA3"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />

            <Text style={styles.label}>
              Password
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9A9DA3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              style={[
                styles.button,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? 'Please wait...'
                  : isSignUp
                  ? 'Create Account'
                  : 'Sign In'}
              </Text>
            </Pressable>

            <Pressable
              style={styles.switchButton}
              onPress={() =>
                setIsSignUp(!isSignUp)
              }
            >
              <Text style={styles.switchText}>
                {isSignUp
                  ? 'Already have an account? '
                  : "Don't have an account? "}

                <Text style={styles.switchBold}>
                  {isSignUp
                    ? 'Sign In'
                    : 'Create Account'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },

  keyboard: {
    flex: 1,
  },

  content: {
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  icon: {
    fontSize: 45,
    marginBottom: 12,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#17181C',
  },

  subtitle: {
    fontSize: 14,
    color: '#737780',
    marginTop: 6,
  },

  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
  },

  heading: {
    fontSize: 23,
    fontWeight: '700',
    color: '#17181C',
    marginBottom: 7,
  },

  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#737780',
    marginBottom: 25,
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#303238',
    marginBottom: 8,
  },

  input: {
    height: 52,
    backgroundColor: '#F7F8FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E5E8',
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#17181C',
    marginBottom: 18,
  },

  button: {
    height: 54,
    backgroundColor: '#22252B',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  switchButton: {
    alignItems: 'center',
    marginTop: 20,
  },

  switchText: {
    fontSize: 14,
    color: '#737780',
  },

  switchBold: {
    color: '#22252B',
    fontWeight: '700',
  },
});