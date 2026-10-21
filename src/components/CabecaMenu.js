import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Button, Divider, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const CabecalhoMenu = ({ navigation }) => {
    const { user, logout } = useAuth();

    const navigateTo = (screen) => {
        navigation.closeDrawer();

        setTimeout(() => {
            navigation.navigate('Início', { screen });
        }, 150);
    };

    const sair = async () => {
        try {
            await logout();
            navigation.closeDrawer();

            setTimeout(() => {
                navigation.navigate('Início', {
                    screen: 'Home',
                });
            }, 150);
        } catch (error) {
            Alert.alert('Não foi possível sair', error.message);
        }
    };

    return (
        <View style={styles.container}>

            <View style={styles.profile}>
                {user?.avatarUrl ? (
                    <Avatar.Image
                        size={56}
                        source={{ uri: api.imageUrl(user.avatarUrl) }}
                        style={styles.avatar}
                    />
                ) : (
                    <Avatar.Icon
                        size={56}
                        icon={user ? 'account' : 'account-outline'}
                        color="#FFFFFF"
                        style={styles.avatar}
                    />
                )}

                <View style={styles.userInfo}>
                    <Text style={styles.name} numberOfLines={1}>
                        {user?.name || 'Visitante'}
                    </Text>

                    <Text style={styles.email} numberOfLines={1}>
                        {user?.email || 'Acesso público'}
                    </Text>
                </View>
            </View>

            <Divider style={styles.divider} />

            {user ? (
                <>
                    <Button
                        icon="account-outline"
                        textColor="#EDE9FE"
                        contentStyle={styles.buttonContent}
                        style={styles.button}
                        onPress={() => navigateTo('Perfil')}
                    >
                        Meu perfil
                    </Button>

                    <Button
                        icon="logout"
                        textColor="#E8798A"
                        contentStyle={styles.buttonContent}
                        style={styles.button}
                        onPress={sair}
                    >
                        Sair
                    </Button>
                </>
            ) : (
                <Button
                    icon="login"
                    textColor="#EDE9FE"
                    contentStyle={styles.buttonContent}
                    style={styles.button}
                    onPress={() => navigateTo('Acesso')}
                >
                    Entrar ou cadastrar
                </Button>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1f1f27',
        paddingHorizontal: 30,
        paddingTop: 60,
        paddingBottom: 24,
    },

    profile: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    avatar: {
        backgroundColor: '#7C3AED',
    },

    userInfo: {
        flex: 1,
        marginLeft: 13,
    },

    name: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    email: {
        color: '#918D9D',
        fontSize: 12,
        marginTop: 3,
    },

    divider: {
        backgroundColor: '#292732',
        marginVertical: 18,
    },

    button: {
        borderRadius: 12,
        marginVertical: 2,
    },

    buttonContent: {
        minHeight: 46,
        justifyContent: 'flex-start',
        paddingHorizontal: 8,
    },
});