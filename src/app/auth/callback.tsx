import { useEffect } from 'react';
import { View, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const url = await Linking.getInitialURL();

        console.log('AUTH CALLBACK URL:', url);

        if (!url) {
          router.replace('/login');
          return;
        }

        const parsed = Linking.parse(url);

        console.log(
          'AUTH CALLBACK PARAMS:',
          parsed.queryParams
        );

        const accessToken =
          parsed.queryParams?.access_token;

        const refreshToken =
          parsed.queryParams?.refresh_token;

        if (!accessToken || !refreshToken) {
          console.log(
            'No authentication tokens found.'
          );

          router.replace('/login');
          return;
        }

        const { error } =
          await supabase.auth.setSession({
            access_token: String(accessToken),
            refresh_token: String(refreshToken),
          });

        if (error) {
          throw error;
        }

        console.log(
          'AUTH SESSION CREATED SUCCESSFULLY'
        );

        router.replace('/home');
      } catch (error) {
        console.error(
          'AUTH CALLBACK ERROR:',
          error
        );

        router.replace('/login');
      }
    };

    handleAuth();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text>
        Confirming your account...
      </Text>
    </View>
  );
}