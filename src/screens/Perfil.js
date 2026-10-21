import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Avatar, Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const Perfil = ({ navigation }) => {
    const { token, user, logout, updateUser } = useAuth();

    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);

    const sair = async () => {
        await logout();
        navigation.navigate('Home');
    };

    const changeAvatar = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permissão necessária', 'Permita o acesso à galeria para selecionar sua foto.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setUploadingAvatar(true);
                const updated = await api.uploadAvatar(result.assets[0], token);
                await updateUser({ avatarUrl: updated.avatarUrl });
                Alert.alert('Sucesso', 'Foto de perfil atualizada.');
            }
        } catch (error) {
            Alert.alert('Erro ao atualizar foto', error.message);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const removeAvatar = async () => {
        Alert.alert('Remover foto', 'Deseja remover sua foto de perfil?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setUploadingAvatar(true);
                        await api.deleteAvatar(token);
                        await updateUser({ avatarUrl: null });
                        Alert.alert('Sucesso', 'Foto de perfil removida.');
                    } catch (error) {
                        Alert.alert('Erro', error.message);
                    } finally {
                        setUploadingAvatar(false);
                    }
                },
            },
        ]);
    };

    const handleSavePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Campos obrigatórios', 'Preencha todos os campos para alterar a senha.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Senhas não conferem', 'A nova senha e a confirmação devem ser iguais.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Senha muito curta', 'A nova senha deve ter no mínimo 8 caracteres.');
            return;
        }

        try {
            setSavingPassword(true);
            await api.changePassword(currentPassword, newPassword, token);
            Alert.alert('Sucesso', 'Senha alterada com sucesso.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordForm(false);
        } catch (error) {
            Alert.alert('Erro ao alterar senha', error.message);
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <View style={styles.screen}>
            <Appbar.Header style={styles.header}>
                <Appbar.BackAction
                    iconColor="#F5F3FF"
                    onPress={() => navigation.goBack()}
                />
                <Appbar.Content
                    title="Meu perfil"
                    titleStyle={styles.headerTitle}
                />
            </Appbar.Header>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarContainer}>
                        {user?.avatarUrl ? (
                            <Avatar.Image
                                size={104}
                                source={{ uri: api.imageUrl(user.avatarUrl) }}
                                style={styles.avatar}
                            />
                        ) : (
                            <Avatar.Icon
                                size={104}
                                icon={user ? 'account' : 'account-outline'}
                                color="#FFFFFF"
                                style={styles.avatar}
                            />
                        )}
                    </View>

                    {user ? (
                        <IconButton
                            icon="camera"
                            iconColor="#FFFFFF"
                            size={20}
                            style={styles.cameraButton}
                            loading={uploadingAvatar}
                            disabled={uploadingAvatar}
                            onPress={changeAvatar}
                        />
                    ) : null}
                </View>

                {user && user.avatarUrl ? (
                    <Button
                        mode="text"
                        textColor="#FDA4AF"
                        style={styles.removePhotoButton}
                        labelStyle={styles.removePhotoLabel}
                        onPress={removeAvatar}
                        disabled={uploadingAvatar}
                    >
                        Remover foto de perfil
                    </Button>
                ) : null}

                <Text style={styles.name}>
                    {user?.name || 'Visitante'}
                </Text>

                <Text style={styles.email}>
                    {user?.email || 'Nenhuma conta conectada'}
                </Text>

                {user ? (
                    <View style={styles.sectionContainer}>
                        <Card style={styles.card} mode="contained">
                            <Card.Content style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.cardTitle}>Segurança da Conta</Text>
                                        <Text style={styles.cardSubtitle}>Gerencie a sua senha de acesso</Text>
                                    </View>
                                    <Button
                                        mode="outlined"
                                        textColor="#A78BFA"
                                        style={styles.togglePassButton}
                                        labelStyle={styles.togglePassLabel}
                                        onPress={() => setShowPasswordForm(!showPasswordForm)}
                                    >
                                        {showPasswordForm ? 'Cancelar' : 'Alterar Senha'}
                                    </Button>
                                </View>

                                {showPasswordForm ? (
                                    <View style={styles.passwordForm}>
                                        <Divider style={styles.formDivider} />

                                        <TextInput
                                            label="Senha atual"
                                            value={currentPassword}
                                            onChangeText={setCurrentPassword}
                                            secureTextEntry={!showCurrentPass}
                                            right={
                                                <TextInput.Icon
                                                    icon={showCurrentPass ? 'eye-off' : 'eye'}
                                                    onPress={() => setShowCurrentPass(!showCurrentPass)}
                                                />
                                            }
                                            mode="outlined"
                                            textColor="#FFFFFF"
                                            outlineColor="#34313E"
                                            activeOutlineColor="#8B5CF6"
                                            style={styles.input}
                                        />

                                        <TextInput
                                            label="Nova senha (mínimo 8 caracteres)"
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            secureTextEntry={!showNewPass}
                                            right={
                                                <TextInput.Icon
                                                    icon={showNewPass ? 'eye-off' : 'eye'}
                                                    onPress={() => setShowNewPass(!showNewPass)}
                                                />
                                            }
                                            mode="outlined"
                                            textColor="#FFFFFF"
                                            outlineColor="#34313E"
                                            activeOutlineColor="#8B5CF6"
                                            style={styles.input}
                                        />

                                        <TextInput
                                            label="Confirmar nova senha"
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showNewPass}
                                            mode="outlined"
                                            textColor="#FFFFFF"
                                            outlineColor="#34313E"
                                            activeOutlineColor="#8B5CF6"
                                            style={styles.input}
                                        />

                                        <Button
                                            mode="contained"
                                            buttonColor="#7C3AED"
                                            textColor="#FFFFFF"
                                            loading={savingPassword}
                                            disabled={savingPassword}
                                            style={styles.savePassButton}
                                            contentStyle={styles.savePassButtonContent}
                                            labelStyle={styles.savePassLabel}
                                            onPress={handleSavePassword}
                                        >
                                            SALVAR NOVA SENHA
                                        </Button>
                                    </View>
                                ) : null}
                            </Card.Content>
                        </Card>

                        <Button
                            mode="outlined"
                            icon="logout"
                            textColor="#FDA4AF"
                            style={styles.logoutButton}
                            contentStyle={styles.buttonContent}
                            labelStyle={styles.buttonLabel}
                            onPress={sair}
                        >
                            SAIR DA CONTA
                        </Button>
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#0B0B0F',
    },

    header: {
        backgroundColor: '#0B0B0F',
        elevation: 0,
    },

    headerTitle: {
        color: '#FFFFFF',
        fontSize: 21,
        fontWeight: '800',
    },

    scroll: {
        flex: 1,
    },

    content: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 36,
        paddingBottom: 48,
    },

    avatarWrapper: {
        position: 'relative',
    },

    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 40,
        backgroundColor: '#1E1B29',
        borderWidth: 2,
        borderColor: '#4C3575',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },

    avatar: {
        backgroundColor: '#7C3AED',
    },

    cameraButton: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        backgroundColor: '#7C3AED',
        borderWidth: 2,
        borderColor: '#0B0B0F',
        borderRadius: 20,
        margin: 0,
    },

    removePhotoButton: {
        marginTop: 6,
    },

    removePhotoLabel: {
        fontSize: 12,
        fontWeight: '600',
    },

    name: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 18,
        textAlign: 'center',
    },

    email: {
        color: '#9693A1',
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
    },

    sectionContainer: {
        width: '100%',
        marginTop: 32,
    },

    card: {
        backgroundColor: '#15141B',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#292732',
        marginBottom: 20,
    },

    cardContent: {
        padding: 16,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    cardTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    cardSubtitle: {
        color: '#71717A',
        fontSize: 12,
        marginTop: 2,
    },

    togglePassButton: {
        borderColor: '#4C3575',
        borderRadius: 10,
    },

    togglePassLabel: {
        fontSize: 11,
        fontWeight: '700',
    },

    passwordForm: {
        marginTop: 12,
    },

    formDivider: {
        backgroundColor: '#292732',
        marginBottom: 16,
    },

    input: {
        backgroundColor: '#1B1A22',
        marginBottom: 12,
        fontSize: 14,
    },

    savePassButton: {
        borderRadius: 12,
        marginTop: 6,
    },

    savePassButtonContent: {
        height: 46,
    },

    savePassLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    logoutButton: {
        borderColor: '#5A3039',
        borderRadius: 15,
        marginTop: 8,
    },

    buttonContent: {
        height: 50,
    },

    buttonLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});