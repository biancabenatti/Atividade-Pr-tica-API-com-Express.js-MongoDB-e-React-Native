require('dotenv').config();

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('./models/User');
const Content = require('./models/Content');
const requireAuth = require('./middleware/auth');

if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    throw new Error('Defina MONGODB_URI e JWT_SECRET no arquivo server/.env.');
}

const app = express();
const port = Number(process.env.PORT) || 3000;
const uploadDirectory = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) req.body = {};
    next();
});
app.use('/uploads', express.static(uploadDirectory));

const storage = multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
        const extensions = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
        };
        callback(null, `${randomUUID()}${extensions[file.mimetype]}`);
    },
});
const uploadImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.mimetype)) {
            return callback(new Error('Envie uma imagem JPG, PNG, WEBP ou GIF.'));
        }
        return callback(null, true);
    },
});

const asyncRoute = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

function createSession(user) {
    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return {
        token,
        user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl || null },
    };
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function removeStoredImage(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
    const filename = path.basename(imageUrl);
    try {
        await fs.promises.unlink(path.join(uploadDirectory, filename));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.post('/api/auth/register', asyncRoute(async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 254 || password.length < 8 || password.length > 72) {
        return res.status(400).json({ message: 'Informe nome, e-mail válido e senha com 8 a 72 caracteres.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    try {
        const user = await User.create({ name, email, passwordHash });
        return res.status(201).json(createSession(user));
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Já existe uma conta com esse e-mail.' });
        }
        throw error;
    }
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    }
    return res.json(createSession(user));
}));

app.get('/api/auth/me', requireAuth, asyncRoute(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'Usuário não encontrado.' });
    return res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl || null });
}));

app.put('/api/auth/password', requireAuth, asyncRoute(async (req, res) => {
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Informe a senha atual e a nova senha.' });
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
        return res.status(400).json({ message: 'A nova senha deve ter entre 8 e 72 caracteres.' });
    }

    const user = await User.findById(req.userId).select('+passwordHash');
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });

    const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatches) {
        return res.status(400).json({ message: 'A senha atual informada está incorreta.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    return res.json({ message: 'Senha alterada com sucesso.' });
}));

app.post('/api/auth/avatar', requireAuth, uploadImage.single('avatar'), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Selecione uma imagem para o avatar.' });
    const user = await User.findById(req.userId);
    if (!user) {
        await fs.promises.unlink(req.file.path);
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    }
    const previousAvatar = user.avatarUrl;
    user.avatarUrl = `/uploads/${req.file.filename}`;
    await user.save();
    await removeStoredImage(previousAvatar);
    return res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl });
}));

app.delete('/api/auth/avatar', requireAuth, asyncRoute(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado.' });
    const previousAvatar = user.avatarUrl;
    user.avatarUrl = null;
    await user.save();
    await removeStoredImage(previousAvatar);
    return res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: null });
}));

app.get('/api/content', asyncRoute(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter = query
        ? { $or: ['title', 'subtitle', 'description'].map((field) => ({ [field]: { $regex: escapeRegex(query), $options: 'i' } })) }
        : {};
    const items = await Content.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(items);
}));

app.post('/api/content', requireAuth, asyncRoute(async (req, res) => {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const subtitle = typeof req.body.subtitle === 'string' ? req.body.subtitle.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (!title) return res.status(400).json({ message: 'O título é obrigatório.' });
    const item = await Content.create({ title, subtitle, description, createdBy: req.userId });
    return res.status(201).json(item);
}));

app.put('/api/content/:id', requireAuth, asyncRoute(async (req, res) => {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Conteúdo não encontrado.' });
    if (item.createdBy.toString() !== req.userId) {
        return res.status(403).json({ message: 'Você não tem permissão para alterar este conteúdo.' });
    }
    const updates = {};
    for (const field of ['title', 'subtitle', 'description']) {
        if (typeof req.body[field] === 'string') updates[field] = req.body[field].trim();
    }
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'Informe ao menos um campo para atualizar.' });
    }
    if (updates.title !== undefined && !updates.title) {
        return res.status(400).json({ message: 'O título é obrigatório.' });
    }
    Object.assign(item, updates);
    await item.save();
    return res.json(item);
}));

app.delete('/api/content/:id', requireAuth, asyncRoute(async (req, res) => {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Conteúdo não encontrado.' });
    if (item.createdBy.toString() !== req.userId) {
        return res.status(403).json({ message: 'Você não tem permissão para excluir este conteúdo.' });
    }
    await removeStoredImage(item.imageUrl);
    await item.deleteOne();
    return res.status(204).end();
}));

app.post('/api/content/:id/image', requireAuth, uploadImage.single('image'), asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Selecione uma imagem.' });
    const item = await Content.findById(req.params.id);
    if (!item) {
        await fs.promises.unlink(req.file.path);
        return res.status(404).json({ message: 'Conteúdo não encontrado.' });
    }
    if (item.createdBy.toString() !== req.userId) {
        await fs.promises.unlink(req.file.path);
        return res.status(403).json({ message: 'Você não tem permissão para alterar a imagem deste conteúdo.' });
    }
    const previousImage = item.imageUrl;
    item.imageUrl = `/uploads/${req.file.filename}`;
    await item.save();
    await removeStoredImage(previousImage);
    return res.json(item);
}));

app.delete('/api/content/:id/image', requireAuth, asyncRoute(async (req, res) => {
    const item = await Content.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Conteúdo não encontrado.' });
    if (item.createdBy.toString() !== req.userId) {
        return res.status(403).json({ message: 'Você não tem permissão para excluir a imagem deste conteúdo.' });
    }
    const previousImage = item.imageUrl;
    item.imageUrl = null;
    await item.save();
    await removeStoredImage(previousImage);
    return res.json(item);
}));

app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'O corpo JSON da solicitação é inválido.' });
    }
    if (error instanceof multer.MulterError) {
        const message = error.code === 'LIMIT_FILE_SIZE'
            ? 'A imagem deve ter no máximo 5 MB.'
            : 'Não foi possível processar o arquivo enviado.';
        return res.status(400).json({ message });
    }
    if (error.message?.startsWith('Envie uma imagem')) {
        return res.status(400).json({ message: error.message });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Os dados informados excedem os limites permitidos.' });
    }
    if (error.name === 'CastError') {
        return res.status(400).json({ message: 'Identificador inválido.' });
    }
    console.error('Erro na API:', error);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        app.listen(port, '0.0.0.0', () => {
            console.log(`API disponível na porta ${port}.`);
        });
    })
    .catch((error) => {
        console.error('Não foi possível conectar ao MongoDB:', error.message);
        process.exitCode = 1;
    });
