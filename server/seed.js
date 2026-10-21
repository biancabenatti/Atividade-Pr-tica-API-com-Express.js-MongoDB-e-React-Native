require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const Content = require('./src/models/Content');

if (!process.env.MONGODB_URI) {
    throw new Error('Defina MONGODB_URI no arquivo server/.env.');
}

async function runSeed() {
    await mongoose.connect(process.env.MONGODB_URI);

    const email = 'ranzer@gmail.com';
    const password = '123456789';
    const passwordHash = await bcrypt.hash(password, 12);

    let user = await User.findOne({ email });
    if (!user) {
        user = await User.create({
            name: 'Ranzer',
            email,
            passwordHash,
        });
    } else {
        user.passwordHash = passwordHash;
        await user.save();
    }

    await Content.deleteMany({ createdBy: user._id });

    const movies = [
        {
            title: 'Interestelar',
            subtitle: 'Ficção Científica · Christopher Nolan',
            description: 'Com a Terra à beira da extinção pela escassez de recursos e crises climáticas devastadoras, um corajoso grupo de astronautas é convocado para uma missão sem precedentes. Atravessando um buraco de minhoca nos confins do sistema solar, eles exploram dimensões desconhecidas no espaço e no tempo, desafiando a gravidade e a própria relatividade para encontrar um novo lar para a humanidade.',
            imageUrl: '/uploads/movie-interstellar.jpg',
            createdBy: user._id,
        },
        {
            title: 'A Origem',
            subtitle: 'Suspense / Ficção · Christopher Nolan',
            description: 'Dom Cobb é um habilidoso ladrão corporativo especializado na perigosa arte da extração: roubar segredos valiosos do fundo do subconsciente durante o estado de sono profundo. Diante de uma última chance de redenção para rever seus filhos, ele aceita uma tarefa quase impossível: a inserção, implantando uma ideia na mente do herdeiro de um império industrial através de múltiplos níveis de sonhos lúcidos compartilhados.',
            imageUrl: '/uploads/movie-inception.jpg',
            createdBy: user._id,
        },
        {
            title: 'O Poderoso Chefão',
            subtitle: 'Drama Policial · Francis Ford Coppola',
            description: 'Uma monumental crônica da ascensão e consolidação da família Corleone no submundo de Nova York após a Segunda Guerra Mundial. O patriarca Don Vito Corleone governa seu império mafioso com honra, lealdade e justiça própria. Quando uma tentativa de assassinato desestabiliza a liderança, seu filho mais novo, Michael, um condecorado veterano de guerra, é arrastado para assumir o controle dos negócios da dinastia.',
            imageUrl: '/uploads/movie-godfather.jpg',
            createdBy: user._id,
        },
    ];

    await Content.insertMany(movies);
    await mongoose.disconnect();
}

runSeed()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
