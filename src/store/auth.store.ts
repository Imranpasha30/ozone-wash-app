import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  id: string;
  phone: string;
  role: 'customer' | 'field_team' | 'admin';
  name: string | null;
  lang: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string) => Promise<string>;
  loadStoredAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitializing: true,
  isAuthenticated: false,

  sendOtp: async (phone: string) => {
    set({ isLoading: true });
    try {
      // response = { success, message, data: { message } }
      const response: any = await authAPI.sendOtp(phone);
      console.log('sendOtp response:', JSON.stringify(response));
    } catch (err) {
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (phone: string, otp: string) => {
    set({ isLoading: true });
    try {
      // Get FCM token silently — never blocks login if it fails
      let fcm_token: string | undefined;
      try {
        const { registerForPushNotificationsAsync } = await import('../utils/pushNotifications');
        fcm_token = (await registerForPushNotificationsAsync()) ?? undefined;
      } catch (_) {}

      // response = { success, message, data: { token, user } }
      const response: any = await authAPI.verifyOtp(phone, otp, fcm_token);
      console.log('verifyOtp response:', JSON.stringify(response));

      // Since interceptor returns response.data
      // response here = { success, message, data: { token, user } }
      const token = response.data.token;
      const user = response.data.user;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });

      return user.role;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  loadStoredAuth: async () => {
    console.log('[9] loadStoredAuth started');
    set({ isInitializing: true });
    try {
      console.log('[10] Reading AsyncStorage...');
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      console.log('[11] AsyncStorage read done — hasToken:', !!storedToken, 'hasUser:', !!storedUser);

      if (storedToken && storedUser) {
        set({
          token: storedToken,
          user: JSON.parse(storedUser),
          isAuthenticated: true,
        });
        console.log('[12] Restored auth from storage');
      }
    } catch (err) {
      console.error('[ERR] loadStoredAuth error:', err);
    } finally {
      console.log('[13] loadStoredAuth done — setting isInitializing=false');
      set({ isInitializing: false });
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  setUser: (user: User) => set({ user }),
}));

export default useAuthStore;