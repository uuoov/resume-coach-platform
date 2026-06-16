import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import apiClient, { AUTH_EXPIRED_EVENT, AUTH_TOKEN_KEY } from '../services/api';

interface User {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  role?: 'USER' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'resume_coach_user';

const getStoredAuthToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY);

const getStoredUser = (): User | null => {
  const savedUser = localStorage.getItem(USER_KEY);
  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as User;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [loading, setLoading] = useState(() => Boolean(getStoredAuthToken()));

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
  }, []);

  // 初始化：从 localStorage 恢复登录状态
  useEffect(() => {
    if (!token) {
      return;
    }

    let isActive = true;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // 验证令牌是否仍然有效
    apiClient
      .get('/auth/me')
      .then((res) => {
        if (!isActive) {
          return;
        }
        if (res.data.success) {
          setUser(res.data.data);
        } else {
          clearAuth();
        }
      })
      .catch(() => {
        if (isActive) {
          clearAuth();
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [clearAuth, token]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clearAuth);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, clearAuth);
    };
  }, [clearAuth]);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });

    if (response.data.success) {
      const { user: userData, token: authToken } = response.data.data;
      setUser(userData);
      setToken(authToken);
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      throw new Error(response.data.error || '登录失败');
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await apiClient.post('/auth/register', { email, password, name });

    if (response.data.success) {
      const { user: userData, token: authToken } = response.data.data;
      setUser(userData);
      setToken(authToken);
      localStorage.setItem(AUTH_TOKEN_KEY, authToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      throw new Error(response.data.error || '注册失败');
    }
  };

  const logout = () => {
    clearAuth();
    // 清除会话数据，防止数据泄露给下一个登录用户
    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
