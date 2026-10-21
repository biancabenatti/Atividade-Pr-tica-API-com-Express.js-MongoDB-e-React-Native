const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

async function request(path, { token, ...options } = {}) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json; charset=utf-8';
        options.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_URL}${path}`, { ...options, headers });
    let body = null;
    if (response.status !== 204) {
        try {
            body = await response.json();
        } catch {
            throw new Error('O servidor retornou uma resposta inválida.');
        }
    }
    if (!response.ok) {
        throw new Error(body?.message || `Erro na solicitação (${response.status}).`);
    }
    return body;
}

export const api = {
    request,
    imageUrl(path) {
        return path.startsWith('http') ? path : `${API_URL}${path}`;
    },
    getContent(query = '') {
        const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
        return request(`/api/content${suffix}`);
    },
    createContent(content, token) {
        return request('/api/content', { method: 'POST', body: content, token });
    },
    updateContent(id, content, token) {
        return request(`/api/content/${id}`, { method: 'PUT', body: content, token });
    },
    deleteContent(id, token) {
        return request(`/api/content/${id}`, { method: 'DELETE', token });
    },
    uploadImage(id, asset, token) {
        const form = new FormData();
        const name = asset.fileName || `image-${Date.now()}.jpg`;
        if (asset.file) {
            form.append('image', asset.file, name);
        } else {
            form.append('image', {
                uri: asset.uri,
                name,
                type: asset.mimeType || 'image/jpeg',
            });
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/api/content/${id}/image`);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.onload = () => {
                let body = null;
                if (xhr.responseText) {
                    try {
                        body = JSON.parse(xhr.responseText);
                    } catch {
                        reject(new Error('O servidor retornou uma resposta inválida.'));
                        return;
                    }
                }
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error(body?.message || `Erro na solicitação (${xhr.status}).`));
                    return;
                }
                resolve(body);
            };
            xhr.onerror = () => reject(new Error('Não foi possível conectar ao servidor.'));
            xhr.onabort = () => reject(new Error('O envio da imagem foi cancelado.'));
            xhr.send(form);
        });
    },
    deleteImage(id, token) {
        return request(`/api/content/${id}/image`, { method: 'DELETE', token });
    },
    login(email, password) {
        return request('/api/auth/login', { method: 'POST', body: { email, password } });
    },
    register(name, email, password) {
        return request('/api/auth/register', { method: 'POST', body: { name, email, password } });
    },
    changePassword(currentPassword, newPassword, token) {
        return request('/api/auth/password', { method: 'PUT', body: { currentPassword, newPassword }, token });
    },
    uploadAvatar(asset, token) {
        const form = new FormData();
        const name = asset.fileName || `avatar-${Date.now()}.jpg`;
        if (asset.file) {
            form.append('avatar', asset.file, name);
        } else {
            form.append('avatar', {
                uri: asset.uri,
                name,
                type: asset.mimeType || 'image/jpeg',
            });
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/api/auth/avatar`);
            if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.onload = () => {
                let body = null;
                if (xhr.responseText) {
                    try {
                        body = JSON.parse(xhr.responseText);
                    } catch {
                        reject(new Error('O servidor retornou uma resposta inválida.'));
                        return;
                    }
                }
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(new Error(body?.message || `Erro na solicitação (${xhr.status}).`));
                    return;
                }
                resolve(body);
            };
            xhr.onerror = () => reject(new Error('Não foi possível conectar ao servidor.'));
            xhr.onabort = () => reject(new Error('O envio da imagem foi cancelado.'));
            xhr.send(form);
        });
    },
    deleteAvatar(token) {
        return request('/api/auth/avatar', { method: 'DELETE', token });
    },
};
