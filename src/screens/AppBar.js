import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    ImageBackground,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import {
    Appbar,
    Button,
    Icon,
    Portal,
    Snackbar,
    Text,
} from 'react-native-paper';

import { useFocusEffect } from '@react-navigation/native';

import ModCard from '../components/Cards';
import ContentForm from '../components/ContentForm';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/*
 * =========================================
 * PÔSTERES / BANNERS
 * =========================================
 */

const BANNERS = [
    {
        id: 'banner-1',
        image: require('../../assets/banner1.jpg'),
    },
    {
        id: 'banner-2',
        image: require('../../assets/banner2.jpg'),
    },
    {
        id: 'banner-3',
        image: require('../../assets/banner3.jpg'),
    },
];

/*
 * =========================================
 * CONFIGURAÇÕES DOS PÔSTERES
 * =========================================
 */

const POSTER_WIDTH = 148;
const POSTER_HEIGHT = 300;
const POSTER_GAP = 12;

const MARQUEE_BANNERS = [
    ...BANNERS,
    ...BANNERS,
    ...BANNERS,
];

const AppBar = ({ navigation }) => {
    const { token, user } = useAuth();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [editorVisible, setEditorVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const guestScrollViewRef = useRef(null);
    const [catalogSectionY, setCatalogSectionY] = useState(0);

    const scrollToCatalog = () => {
        if (guestScrollViewRef.current) {
            guestScrollViewRef.current.scrollTo({
                y: catalogSectionY,
                animated: true,
            });
        }
    };

    const marqueeAnimation = useRef(
        new Animated.Value(0)
    ).current;

    const marqueeLoop = useRef(null);

    const SINGLE_SET_WIDTH =
        BANNERS.length *
        (POSTER_WIDTH + POSTER_GAP);

    const loadItems = useCallback(async () => {
        setLoading(true);

        try {
            const content = await api.getContent();
            setItems(content);
            setError('');
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadItems();
        }, [loadItems])
    );

    /*
     * =========================================
     * MARQUEE
     * =========================================
     */

    useEffect(() => {
        if (user) {
            return;
        }

        marqueeAnimation.setValue(0);

        marqueeLoop.current = Animated.loop(
            Animated.timing(
                marqueeAnimation,
                {
                    toValue: -SINGLE_SET_WIDTH,
                    duration: 18000,
                    useNativeDriver: true,
                }
            )
        );

        marqueeLoop.current.start();

        return () => {
            if (marqueeLoop.current) {
                marqueeLoop.current.stop();
            }

            marqueeAnimation.stopAnimation();
        };
    }, [
        user,
        marqueeAnimation,
        SINGLE_SET_WIDTH,
    ]);

    /*
     * =========================================
     * EDITOR
     * =========================================
     */

    const openEditor = (item = null) => {
        setEditingItem(item);
        setEditorVisible(true);
    };

    /*
     * =========================================
     * SALVAR
     * =========================================
     */

    const saveItem = async ({
        title,
        subtitle,
        description,
        image,
        removeImage,
    }) => {
        setSaving(true);

        try {
            const saved = editingItem
                ? await api.updateContent(
                    editingItem._id,
                    {
                        title,
                        subtitle,
                        description,
                    },
                    token
                )
                : await api.createContent(
                    {
                        title,
                        subtitle,
                        description,
                    },
                    token
                );

            if (!editingItem) {
                setEditingItem(saved);
            }

            if (image) {
                await api.uploadImage(
                    saved._id,
                    image,
                    token
                );
            } else if (
                removeImage &&
                editingItem?.imageUrl
            ) {
                await api.deleteImage(
                    saved._id,
                    token
                );
            }

            setEditorVisible(false);
            setNotice('Conteúdo salvo com sucesso.');

            await loadItems();
        } catch (requestError) {
            Alert.alert(
                'Não foi possível salvar',
                requestError.message
            );
        } finally {
            setSaving(false);
        }
    };

    /*
     * =========================================
     * EXCLUIR CONTEÚDO
     * =========================================
     */

    const deleteItem = (item) => {
        Alert.alert(
            'Excluir conteúdo',
            `Deseja excluir "${item.title}"?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Excluir',
                    style: 'destructive',

                    onPress: async () => {
                        try {
                            await api.deleteContent(
                                item._id,
                                token
                            );

                            await loadItems();
                        } catch (requestError) {
                            Alert.alert(
                                'Não foi possível excluir',
                                requestError.message
                            );
                        }
                    },
                },
            ]
        );
    };

    /*
     * =========================================
     * EXCLUIR IMAGEM
     * =========================================
     */

    const deleteImage = (item) => {
        Alert.alert(
            'Excluir imagem',
            `Deseja excluir a imagem de "${item.title}"?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Excluir imagem',
                    style: 'destructive',

                    onPress: async () => {
                        try {
                            await api.deleteImage(
                                item._id,
                                token
                            );

                            await loadItems();
                        } catch (requestError) {
                            Alert.alert(
                                'Não foi possível excluir a imagem',
                                requestError.message
                            );
                        }
                    },
                },
            ]
        );
    };

    /*
     * =========================================
     * TELA
     * =========================================
     */

    return (
        <View style={styles.screen}>

            {/* =================================
                HEADER
            ================================= */}

            <Appbar.Header style={styles.header}>

                <Appbar.Action
                    icon="menu"
                    iconColor="#D9D5E3"
                    size={24}
                    onPress={() =>
                        navigation.openDrawer()
                    }
                />

                <Pressable
                    style={styles.logoContainer}
                    onPress={() =>
                        navigation.navigate('Home')
                    }
                >
                    <Text style={styles.logoContent}>
                        Content
                    </Text>

                    <Text style={styles.logoHub}>
                        Hub
                    </Text>
                </Pressable>

                <View style={styles.headerSpacer} />

                <Pressable
                    style={styles.profileButton}
                    onPress={() =>
                        navigation.navigate(
                            user ? 'Perfil' : 'Acesso'
                        )
                    }
                >
                    <Icon
                        source={
                            user
                                ? 'account-check'
                                : 'account-outline'
                        }
                        size={22}
                        color="#D9D5E3"
                    />
                </Pressable>

            </Appbar.Header>

            {/* =================================
                VISITANTE
            ================================= */}

            {!user ? (

                <ScrollView
                    ref={guestScrollViewRef}
                    style={styles.scroll}
                    contentContainerStyle={styles.guestContent}
                    showsVerticalScrollIndicator={false}
                >

                    {/* =================================
                        ÁREA DOS PÔSTERES
                    ================================= */}

                    <View style={styles.heroSection}>

                        <View style={styles.heroGlow} />

                        <View style={styles.marqueeContainer}>

                            <Animated.View
                                style={[
                                    styles.marqueeTrack,
                                    {
                                        transform: [
                                            {
                                                translateX:
                                                    marqueeAnimation,
                                            },
                                        ],
                                    },
                                ]}
                            >

                                {MARQUEE_BANNERS.map(
                                    (banner, index) => (

                                        <View
                                            key={`${banner.id}-${index}`}
                                            style={styles.posterWrapper}
                                        >

                                            <ImageBackground
                                                source={banner.image}
                                                style={styles.poster}
                                                imageStyle={
                                                    styles.posterImage
                                                }
                                            />

                                        </View>

                                    )
                                )}

                            </Animated.View>

                        </View>


                    </View>

                    {/* =================================
                        TEXTO PRINCIPAL
                    ================================= */}

                    <View style={styles.introSection}>

                        <View style={styles.introLine} />

                        <Text style={styles.eyebrow}>
                            CONTENT · COLLECTION · DISCOVERY
                        </Text>

                        <Text style={styles.guestTitle}>
                            Descubra algo novo.
                        </Text>

                        <Text style={styles.guestText}>
                            Encontre histórias, acompanhe
                            seus conteúdos favoritos e
                            organize tudo em um só lugar.
                        </Text>

                    </View>

                    {/* =================================
                        BOTÕES
                    ================================= */}

                    <View style={styles.guestButtons}>

                        <Button
                            mode="contained"
                            icon="login"
                            buttonColor="#7C3AED"
                            textColor="#FFFFFF"
                            style={styles.guestPrimaryButton}
                            contentStyle={
                                styles.guestButtonContent
                            }
                            labelStyle={
                                styles.guestButtonLabel
                            }
                            onPress={() =>
                                navigation.navigate('Login')
                            }
                        >
                            ENTRAR
                        </Button>

                        <Button
                            mode="outlined"
                            icon="account-plus-outline"
                            textColor="#DDD6FE"
                            style={styles.guestSecondaryButton}
                            contentStyle={
                                styles.guestButtonContent
                            }
                            labelStyle={
                                styles.guestButtonLabel
                            }
                            onPress={() =>
                                navigation.navigate('Cadastro')
                            }
                        >
                            CRIAR CONTA
                        </Button>

                        <Button
                            mode="outlined"
                            icon="eye-outline"
                            textColor="#DDD6FE"
                            style={styles.guestTertiaryButton}
                            contentStyle={
                                styles.guestButtonContent
                            }
                            labelStyle={
                                styles.guestButtonLabel
                            }
                            onPress={scrollToCatalog}
                        >
                            VER CONTEÚDO
                        </Button>

                    </View>

                    <Text style={styles.footerText}>
                        Seu conteúdo. Sua coleção. Seu espaço.
                    </Text>

                    <View
                        onLayout={(event) => {
                            setCatalogSectionY(
                                event.nativeEvent.layout.y
                            );
                        }}
                        style={styles.guestCatalogSection}
                    >
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Pesquisar conteúdos"
                            onPress={() =>
                                navigation.navigate('Pesquisa')
                            }
                            style={({ pressed }) => [
                                styles.search,
                                pressed &&
                                styles.searchPressed,
                            ]}
                        >
                            <Icon
                                source="magnify"
                                size={21}
                                color="#A78BFA"
                            />
                            <Text style={styles.searchText}>
                                Pesquisar no catálogo...
                            </Text>
                            <Icon
                                source="arrow-right"
                                size={19}
                                color="#71717A"
                            />
                        </Pressable>

                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionInfo}>
                                <Text style={styles.sectionTitle}>
                                    Catálogo de Conteúdos
                                </Text>
                                <Text style={styles.sectionSubtitle}>
                                    {items.length > 0
                                        ? `${items.length} ${
                                            items.length === 1
                                                ? 'título disponível'
                                                : 'títulos disponíveis'
                                        }`
                                        : 'Acesso público para visualização'}
                                </Text>
                            </View>
                        </View>

                        {loading && (
                            <View style={styles.stateCard}>
                                <Icon
                                    source="loading"
                                    size={30}
                                    color="#A78BFA"
                                />
                                <Text style={styles.stateTitle}>
                                    Carregando conteúdos
                                </Text>
                                <Text style={styles.stateText}>
                                    Aguarde enquanto carregamos o catálogo.
                                </Text>
                            </View>
                        )}

                        {!loading && error && (
                            <View style={styles.stateCard}>
                                <View style={styles.stateIcon}>
                                    <Icon
                                        source="alert-circle-outline"
                                        size={28}
                                        color="#A78BFA"
                                    />
                                </View>
                                <Text style={styles.stateTitle}>
                                    Não foi possível carregar
                                </Text>
                                <Text style={styles.stateText}>
                                    {error}
                                </Text>
                                <Button
                                    mode="outlined"
                                    textColor="#C4B5FD"
                                    style={styles.retryButton}
                                    onPress={loadItems}
                                >
                                    Tentar novamente
                                </Button>
                            </View>
                        )}

                        {!loading &&
                            !error &&
                            items.length === 0 && (
                                <View style={styles.stateCard}>
                                    <View style={styles.emptyIcon}>
                                        <Icon
                                            source="movie-open-outline"
                                            size={30}
                                            color="#A78BFA"
                                        />
                                    </View>
                                    <Text style={styles.stateTitle}>
                                        Catálogo ainda sem títulos
                                    </Text>
                                    <Text style={styles.stateText}>
                                        Crie uma conta e acesse a área administrativa para cadastrar os primeiros conteúdos.
                                    </Text>
                                </View>
                            )}

                        {!loading &&
                            !error &&
                            items.length > 0 && (
                                <View style={styles.cards}>
                                    {items.map((item) => (
                                        <View
                                            key={item._id}
                                            style={styles.cardWrapper}
                                        >
                                            <ModCard
                                                item={item}
                                                isAuthenticated={false}
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}
                    </View>

                </ScrollView>

            ) : (

                /* =================================
                   USUÁRIO LOGADO
                ================================= */

                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >

                    {/* PESQUISA */}

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Pesquisar conteúdos"
                        onPress={() =>
                            navigation.navigate('Pesquisa')
                        }
                        style={({ pressed }) => [
                            styles.search,
                            pressed &&
                            styles.searchPressed,
                        ]}
                    >

                        <Icon
                            source="magnify"
                            size={21}
                            color="#A78BFA"
                        />

                        <Text style={styles.searchText}>
                            Pesquisar conteúdos...
                        </Text>

                        <Icon
                            source="arrow-right"
                            size={19}
                            color="#71717A"
                        />

                    </Pressable>

                    {/* CABEÇALHO */}

                    <View style={styles.sectionHeader}>

                        <View style={styles.sectionInfo}>

                            <Text style={styles.sectionTitle}>
                                Conteúdos
                            </Text>

                            <Text style={styles.sectionSubtitle}>
                                {items.length > 0
                                    ? `${items.length} ${
                                        items.length === 1
                                            ? 'título disponível'
                                            : 'títulos disponíveis'
                                    }`
                                    : 'Seu catálogo'}
                            </Text>

                        </View>

                        <Pressable
                            onPress={() =>
                                openEditor()
                            }
                            style={({ pressed }) => [
                                styles.addButton,
                                pressed &&
                                styles.addButtonPressed,
                            ]}
                        >

                            <Icon
                                source="plus"
                                size={19}
                                color="#FFFFFF"
                            />

                            <Text style={styles.addButtonText}>
                                Adicionar
                            </Text>

                        </Pressable>

                    </View>

                    {/* CARREGANDO */}

                    {loading && (
                        <View style={styles.stateCard}>

                            <Icon
                                source="loading"
                                size={30}
                                color="#A78BFA"
                            />

                            <Text style={styles.stateTitle}>
                                Carregando conteúdos
                            </Text>

                            <Text style={styles.stateText}>
                                Aguarde enquanto carregamos
                                o catálogo.
                            </Text>

                        </View>
                    )}

                    {/* ERRO */}

                    {!loading && error && (
                        <View style={styles.stateCard}>

                            <View style={styles.stateIcon}>

                                <Icon
                                    source="alert-circle-outline"
                                    size={28}
                                    color="#A78BFA"
                                />

                            </View>

                            <Text style={styles.stateTitle}>
                                Não foi possível carregar
                            </Text>

                            <Text style={styles.stateText}>
                                {error}
                            </Text>

                            <Button
                                mode="outlined"
                                textColor="#C4B5FD"
                                style={styles.retryButton}
                                onPress={loadItems}
                            >
                                Tentar novamente
                            </Button>

                        </View>
                    )}

                    {/* VAZIO */}

                    {!loading &&
                        !error &&
                        items.length === 0 && (

                            <View style={styles.stateCard}>

                                <View style={styles.emptyIcon}>

                                    <Icon
                                        source="movie-open-outline"
                                        size={30}
                                        color="#A78BFA"
                                    />

                                </View>

                                <Text style={styles.stateTitle}>
                                    Seu catálogo está vazio
                                </Text>

                                <Text style={styles.stateText}>
                                    Adicione seu primeiro conteúdo
                                    para começar.
                                </Text>

                                <Button
                                    mode="contained"
                                    icon="plus"
                                    buttonColor="#8B5CF6"
                                    textColor="#FFFFFF"
                                    style={styles.emptyButton}
                                    onPress={() =>
                                        openEditor()
                                    }
                                >
                                    ADICIONAR CONTEÚDO
                                </Button>

                            </View>
                        )}

                    {/* CARDS */}

                    {!loading &&
                        !error &&
                        items.length > 0 && (

                            <View style={styles.cards}>

                                {items.map((item) => (

                                    <View
                                        key={item._id}
                                        style={styles.cardWrapper}
                                    >

                                        <ModCard
                                            item={item}
                                            isAuthenticated={true}
                                            onEdit={() =>
                                                openEditor(item)
                                            }
                                            onDelete={() =>
                                                deleteItem(item)
                                            }
                                            onDeleteImage={() =>
                                                deleteImage(item)
                                            }
                                        />

                                    </View>

                                ))}

                            </View>
                        )}

                </ScrollView>
            )}

            {/* =================================
                FORMULÁRIO
            ================================= */}

            <ContentForm
                visible={editorVisible}
                item={editingItem}
                saving={saving}
                onDismiss={() =>
                    setEditorVisible(false)
                }
                onSave={saveItem}
            />

            {/* =================================
                SNACKBAR
            ================================= */}

            <Portal>

                <Snackbar
                    visible={Boolean(notice)}
                    onDismiss={() =>
                        setNotice('')
                    }
                    style={styles.snackbar}
                    theme={{
                        colors: {
                            inverseSurface: '#24212D',
                            inverseOnSurface: '#FFFFFF',
                        },
                    }}
                >
                    {notice}
                </Snackbar>

            </Portal>

        </View>
    );
};

/* =========================================
   ESTILOS
========================================= */

const styles = StyleSheet.create({

    /*
     * ========================================
     * BASE
     * ========================================
     */

    screen: {
        flex: 1,
        backgroundColor: '#0B0B0F',
    },

    scroll: {
        flex: 1,
    },

    /*
     * ========================================
     * HEADER
     * ========================================
     */

    header: {
        backgroundColor: '#0B0B0F',
        elevation: 0,
        shadowOpacity: 0,
        height: 60,
        paddingHorizontal: 5,
    },

    logoContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginLeft: 2,
    },

    logoContent: {
        color: '#F7F5FC',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.6,
    },

    logoHub: {
        color: '#9B6CFF',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.6,
    },

    headerSpacer: {
        flex: 1,
    },

    profileButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#15141B',
        borderWidth: 1,
        borderColor: '#282530',
        marginRight: 4,
    },

    /*
     * ========================================
     * HOME VISITANTE
     * ========================================
     */

    guestContent: {
        paddingBottom: 40,
    },

    /*
     * ========================================
     * HERO / PÔSTERES
     * ========================================
     */

    heroSection: {
        position: 'relative',
        marginTop: 12,
        marginBottom: 34,
    },

    heroGlow: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
        backgroundColor: '#211536',
        opacity: 0.32,
        top: 20,
        left: SCREEN_WIDTH / 2 - 120,
    },

    marqueeContainer: {
        width: SCREEN_WIDTH,
        height: POSTER_HEIGHT,
        overflow: 'hidden',
    },

    marqueeTrack: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 20,
    },

    posterWrapper: {
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        marginRight: POSTER_GAP,
    },

    poster: {
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#18181F',
    },

    posterImage: {
        width: POSTER_WIDTH,
        height: POSTER_HEIGHT,
        borderRadius: 12,
        resizeMode: 'cover',
    },

    /*
     * ========================================
     * TEXTO PRINCIPAL
     * ========================================
     */

    introSection: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },

    introLine: {
        width: 34,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#8B5CF6',
        marginBottom: 17,
    },

    eyebrow: {
        color: '#777181',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.7,
        textAlign: 'center',
        marginBottom: 9,
    },

    guestTitle: {
        color: '#FFFFFF',
        fontSize: 29,
        lineHeight: 34,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.8,
    },

    guestText: {
        color: '#9693A1',
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        maxWidth: 340,
        marginTop: 11,
    },

    /*
     * ========================================
     * BOTÕES
     * ========================================
     */

    guestButtons: {
        paddingHorizontal: 28,
        marginTop: 28,
    },

    guestPrimaryButton: {
        borderRadius: 14,
        marginBottom: 10,
    },

    guestSecondaryButton: {
        borderRadius: 14,
        borderColor: '#4D4163',
        marginBottom: 10,
    },

    guestTertiaryButton: {
        borderRadius: 14,
        borderColor: '#6D4AA8',
    },

    guestCatalogSection: {
        marginTop: 36,
        paddingHorizontal: 18,
        width: '100%',
        paddingBottom: 40,
    },

    guestButtonContent: {
        height: 50,
    },

    guestButtonLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.7,
    },

    /*
     * ========================================
     * RODAPÉ
     * ========================================
     */

    footerText: {
        color: '#696574',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 27,
        letterSpacing: 0.3,
    },

    /*
     * ========================================
     * HOME LOGADA
     * ========================================
     */

    content: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 40,
    },

    search: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181F',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#27272F',
        paddingHorizontal: 16,
        marginBottom: 28,
    },

    searchPressed: {
        backgroundColor: '#201D29',
        borderColor: '#6D4AA8',
    },

    searchText: {
        flex: 1,
        color: '#A1A1AA',
        fontSize: 14,
        marginLeft: 11,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 17,
    },

    sectionInfo: {
        flex: 1,
    },

    sectionTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.4,
    },

    sectionSubtitle: {
        color: '#71717A',
        fontSize: 13,
        marginTop: 4,
    },

    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        paddingHorizontal: 13,
        height: 42,
        marginLeft: 12,
    },

    addButtonPressed: {
        backgroundColor: '#7045D8',
    },

    addButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 5,
    },

    cards: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 16,
    },

    cardWrapper: {
        width: '48.5%',
    },

    /*
     * ========================================
     * ESTADOS
     * ========================================
     */

    stateCard: {
        backgroundColor: '#15151B',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#25252D',
        padding: 24,
        alignItems: 'center',
        marginTop: 4,
    },

    stateIcon: {
        width: 56,
        height: 56,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#211C2B',
    },

    stateTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        marginTop: 14,
        textAlign: 'center',
    },

    stateText: {
        color: '#8B8B95',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginTop: 7,
    },

    retryButton: {
        marginTop: 18,
        borderColor: '#5B4A78',
    },

    emptyIcon: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: '#211C2B',
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyButton: {
        marginTop: 20,
        borderRadius: 12,
    },

    snackbar: {
        backgroundColor: '#24212D',
    },
});

export default AppBar;