import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

const AuthContext = createContext(null);
const SESSION_KEY = 'technologic-session';

const getStoredSession = () => Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage.getItem(SESSION_KEY))
    : SecureStore.getItemAsync(SESSION_KEY);
const storeSession = (value) => Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage.setItem(SESSION_KEY, value))
    : SecureStore.setItemAsync(SESSION_KEY, value);
const removeStoredSession = () => Platform.OS === 'web'
    ? Promise.resolve(globalThis.localStorage.removeItem(SESSION_KEY))
    : SecureStore.deleteItemAsync(SESSION_KEY);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        getStoredSession()
            .then((stored) => {
                if (stored) setSession(JSON.parse(stored));
            })
            .catch((error) => {
                console.error('Falha ao recuperar a sessão segura:', error);
                Alert.alert('Sessão indisponível', 'Não foi possível recuperar os dados de acesso salvos neste dispositivo.');
            })
            .finally(() => setReady(true));
    }, []);

    const authenticate = async (operation) => {
        const nextSession = await operation();
        await storeSession(JSON.stringify(nextSession));
        setSession(nextSession);
        return nextSession.user;
    };

    const login = (email, password) => authenticate(() => api.login(email, password));
    const register = (name, email, password) => authenticate(() => api.register(name, email, password));

    const logout = async () => {
        await removeStoredSession();
        setSession(null);
    };

    const updateUser = async (updatedFields) => {
        if (!session) return;
        const nextSession = {
            ...session,
            user: { ...session.user, ...updatedFields },
        };
        await storeSession(JSON.stringify(nextSession));
        setSession(nextSession);
    };

    const value = useMemo(() => ({
        token: session?.token || null,
        user: session?.user || null,
        ready,
        login,
        register,
        logout,
        updateUser,
    }), [session, ready]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
    return context;
}
