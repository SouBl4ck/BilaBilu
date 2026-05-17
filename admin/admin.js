/* =========================================================
   BilaBilu - Painel customizado
   Auth: Netlify Identity   |   Backend: Netlify Git Gateway
   ========================================================= */

const GIT_API = '/.netlify/git/github/contents';
const BRANCH = 'main';

const CATEGORIES = {
    fe:          { label: 'Cantinho da fé',   icon: 'fa-praying-hands' },
    bebe:        { label: 'Cantinho do bebê', icon: 'fa-baby' },
    personagens: { label: 'Personagens',      icon: 'fa-puzzle-piece' }
};

/* ====== Estado ====== */
const state = {
    products: [],
    productsSha: null,
    filter: 'all',
    search: '',
    editingId: null,
    pendingDeleteId: null,
    pendingImage: null   // { dataUrl, file }
};

/* ====== Elementos ====== */
const $ = (id) => document.getElementById(id);
const els = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
    cacheEls();
    bindEvents();
    initIdentity();
}

function cacheEls() {
    [
        'login-screen','app','btn-login','btn-logout',
        'products-grid','empty-state','search-input','category-filters',
        'btn-new','edit-modal','confirm-modal','modal-title',
        'product-form','f-id','f-title','f-price','f-category','f-description',
        'f-image','f-image-file','image-uploader','image-preview',
        'btn-save','btn-confirm-delete','overlay-loader','overlay-msg',
        'toast','toast-msg','confirm-text'
    ].forEach(id => els[id] = $(id));
}

/* ====== Identity / Auth ====== */
function initIdentity() {
    if (!window.netlifyIdentity) {
        toast('Netlify Identity indisponível', true);
        return;
    }
    netlifyIdentity.on('init', user => {
        console.log('[BilaBilu] Identity init →', user ? user.email : 'sem sessão');
        user ? onLogin(user) : showLogin();
    });
    netlifyIdentity.on('login', user => {
        console.log('[BilaBilu] evento login disparado');
        onLogin(user);
        netlifyIdentity.close();
    });
    netlifyIdentity.on('logout', () => {
        console.log('[BilaBilu] evento logout disparado');
        state.products = [];
        showLogin();
    });
    netlifyIdentity.on('error', err => console.warn('[BilaBilu] Identity error', err));
    netlifyIdentity.init();
}

function showLogin() {
    document.body.classList.remove('logged-in');
    els['app'].classList.add('hide');
    els['login-screen'].classList.remove('hide');
}

function onLogin(user) {
    console.log('[BilaBilu] Login OK, exibindo painel.', user && user.email);
    document.body.classList.add('logged-in');
    els['login-screen'].classList.add('hide');
    els['app'].classList.remove('hide');
    loadProducts();
}

/* ====== Eventos ====== */
function bindEvents() {
    els['btn-login'].addEventListener('click', () => netlifyIdentity.open());
    els['btn-logout'].addEventListener('click', () => netlifyIdentity.logout());

    els['search-input'].addEventListener('input', (e) => {
        state.search = e.target.value.trim().toLowerCase();
        render();
    });

    els['category-filters'].querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            els['category-filters'].querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            state.filter = chip.dataset.cat;
            render();
        });
    });

    els['btn-new'].addEventListener('click', () => openEditor(null));

    // Modal close
    document.querySelectorAll('[data-close]').forEach(el =>
        el.addEventListener('click', closeEditor)
    );
    document.querySelectorAll('[data-close-confirm]').forEach(el =>
        el.addEventListener('click', closeConfirm)
    );

    // Form submit
    els['product-form'].addEventListener('submit', (e) => { e.preventDefault(); saveProduct(); });
    els['btn-save'].addEventListener('click', saveProduct);

    // Image uploader
    els['image-preview'].addEventListener('click', () => els['f-image-file'].click());
    els['f-image-file'].addEventListener('change', handleImageFile);

    // Delete confirm
    els['btn-confirm-delete'].addEventListener('click', confirmDelete);

    // ESC fecha modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeEditor(); closeConfirm(); }
    });
}

/* ====== Git Gateway ====== */
async function authHeaders() {
    const user = netlifyIdentity.currentUser();
    if (!user) throw new Error('Não autenticado');
    const token = await user.jwt();   // refresh se necessário
    return { Authorization: `Bearer ${token}` };
}

async function gitGet(path) {
    const headers = await authHeaders();
    const res = await fetch(`${GIT_API}/${path}?ref=${BRANCH}`, {
        headers: { ...headers, Accept: 'application/vnd.github.v3+json' }
    });
    if (!res.ok) throw new Error(`Erro ao ler ${path} (${res.status})`);
    return res.json();
}

async function gitPut(path, contentBase64, message, sha) {
    const headers = await authHeaders();
    const body = { message, content: contentBase64, branch: BRANCH };
    if (sha) body.sha = sha;
    const res = await fetch(`${GIT_API}/${path}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Erro ao salvar ${path} (${res.status}) ${txt.slice(0,140)}`);
    }
    return res.json();
}

/* ====== Base64 UTF-8 ====== */
const encodeB64 = (str) => btoa(unescape(encodeURIComponent(str)));
const decodeB64 = (b64) => decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));

/* ====== Carregar / salvar products.json ====== */
async function loadProducts() {
    showLoader('Carregando produtos...');
    try {
        const data = await gitGet('products.json');
        state.productsSha = data.sha;
        const json = JSON.parse(decodeB64(data.content));
        state.products = Array.isArray(json.products) ? json.products : [];
        render();
    } catch (e) {
        toast(e.message, true);
    } finally {
        hideLoader();
    }
}

async function saveProductsJson(commitMsg) {
    const json = JSON.stringify({ products: state.products }, null, 2) + '\n';
    const result = await gitPut('products.json', encodeB64(json), commitMsg, state.productsSha);
    state.productsSha = result.content.sha;
}

/* ====== Renderização ====== */
function render() {
    const grid = els['products-grid'];
    const list = state.products
        .filter(p => state.filter === 'all' || p.category === state.filter)
        .filter(p => !state.search || (p.title || '').toLowerCase().includes(state.search));

    grid.innerHTML = '';
    if (list.length === 0) {
        els['empty-state'].hidden = false;
        return;
    }
    els['empty-state'].hidden = true;

    list.forEach((p, i) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.style.animationDelay = `${i * 0.04}s`;
        const cat = CATEGORIES[p.category] || { label: p.category || '—' };
        const img = p.image
            ? `<img src="../${p.image}" alt="${escapeHtml(p.title || '')}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'fas fa-image placeholder'}))">`
            : `<i class="fas fa-image placeholder"></i>`;
        card.innerHTML = `
            <div class="card-img">
                ${img}
                <span class="card-cat">${escapeHtml(cat.label)}</span>
            </div>
            <div class="card-body">
                <h3 class="card-title">${escapeHtml(p.title || 'Sem título')}</h3>
                <span class="card-price">R$ ${formatPrice(p.price)}</span>
                <div class="card-actions">
                    <button class="act-edit" data-id="${p.id}" title="Editar">
                        <i class="fas fa-pen"></i> Editar
                    </button>
                    <button class="act-delete" data-id="${p.id}" title="Excluir">
                        <i class="fas fa-trash-alt"></i> Excluir
                    </button>
                </div>
            </div>
        `;
        card.querySelector('.act-edit').addEventListener('click', () => openEditor(p.id));
        card.querySelector('.act-delete').addEventListener('click', () => askDelete(p.id));
        grid.appendChild(card);
    });
}

/* ====== Editor ====== */
function openEditor(id) {
    state.editingId = id;
    state.pendingImage = null;
    els['f-image-file'].value = '';

    if (id == null) {
        els['modal-title'].textContent = 'Novo produto';
        els['f-id'].value = '';
        els['f-title'].value = '';
        els['f-price'].value = '';
        els['f-category'].value = 'fe';
        els['f-description'].value = '';
        els['f-image'].value = '';
        setImagePreview(null);
    } else {
        const p = state.products.find(x => x.id === id);
        if (!p) return;
        els['modal-title'].textContent = 'Editar produto';
        els['f-id'].value = p.id;
        els['f-title'].value = p.title || '';
        els['f-price'].value = p.price ?? '';
        els['f-category'].value = p.category || 'fe';
        els['f-description'].value = p.description || '';
        els['f-image'].value = p.image || '';
        setImagePreview(p.image ? `../${p.image}` : null);
    }
    els['edit-modal'].hidden = false;
}

function closeEditor() {
    els['edit-modal'].hidden = true;
    state.editingId = null;
    state.pendingImage = null;
}

function setImagePreview(src) {
    const box = els['image-preview'];
    if (!src) {
        box.innerHTML = `
            <i class="fas fa-image"></i>
            <span>Clique para escolher uma imagem</span>
        `;
        return;
    }
    box.innerHTML = `
        <img src="${src}" alt="">
        <span class="img-change-hint"><i class="fas fa-rotate"></i> Trocar imagem</span>
    `;
}

function handleImageFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        toast('Imagem maior que 5 MB', true);
        e.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        state.pendingImage = { dataUrl: reader.result, file };
        setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
}

/* ====== Salvar produto ====== */
async function saveProduct() {
    const title = els['f-title'].value.trim();
    const price = parseInt(els['f-price'].value, 10);
    const description = els['f-description'].value.trim();
    const category = els['f-category'].value;

    if (!title || !description || isNaN(price)) {
        toast('Preencha todos os campos.', true);
        return;
    }

    let image = els['f-image'].value;

    try {
        // Upload da nova imagem (se houver)
        if (state.pendingImage) {
            showLoader('Enviando imagem...');
            image = await uploadImage(state.pendingImage.file, state.pendingImage.dataUrl);
        }

        if (!image) {
            hideLoader();
            toast('Escolha uma imagem.', true);
            return;
        }

        showLoader('Salvando produto...');

        const editing = state.editingId != null;
        if (editing) {
            const idx = state.products.findIndex(p => p.id === state.editingId);
            if (idx >= 0) {
                state.products[idx] = { ...state.products[idx], title, price, description, category, image };
            }
        } else {
            const newId = (state.products.reduce((m, p) => Math.max(m, p.id || 0), 0) || 0) + 1;
            state.products.push({ id: newId, title, price, description, category, image });
        }

        await saveProductsJson(editing ? `Atualiza produto: ${title}` : `Adiciona produto: ${title}`);
        closeEditor();
        render();
        toast(editing ? 'Produto atualizado!' : 'Produto adicionado!');
    } catch (e) {
        toast(e.message, true);
    } finally {
        hideLoader();
    }
}

async function uploadImage(file, dataUrl) {
    const safeName = (file.name || 'imagem')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9.\-_]/g, '-')
        .replace(/-+/g, '-');
    const filename = `${Date.now()}-${safeName}`;
    const path = `css/Imagens/${filename}`;
    const base64 = dataUrl.split(',')[1];
    await gitPut(path, base64, `Upload imagem ${filename}`);
    return path;
}

/* ====== Excluir ====== */
function askDelete(id) {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    state.pendingDeleteId = id;
    els['confirm-text'].textContent = `Excluir "${p.title}"? Esta ação não pode ser desfeita.`;
    els['confirm-modal'].hidden = false;
}

function closeConfirm() {
    els['confirm-modal'].hidden = true;
    state.pendingDeleteId = null;
}

async function confirmDelete() {
    const id = state.pendingDeleteId;
    if (id == null) return;
    const p = state.products.find(x => x.id === id);
    closeConfirm();
    showLoader('Excluindo...');
    try {
        state.products = state.products.filter(x => x.id !== id);
        await saveProductsJson(`Remove produto: ${p ? p.title : id}`);
        render();
        toast('Produto excluído.');
    } catch (e) {
        toast(e.message, true);
        await loadProducts();   // re-sincroniza
    } finally {
        hideLoader();
    }
}

/* ====== UI helpers ====== */
function showLoader(msg) {
    els['overlay-msg'].textContent = msg || 'Carregando...';
    els['overlay-loader'].hidden = false;
}
function hideLoader() { els['overlay-loader'].hidden = true; }

let toastTimer;
function toast(msg, error = false) {
    els['toast-msg'].textContent = msg;
    els['toast'].classList.toggle('error', error);
    els['toast'].querySelector('i').className = error ? 'fas fa-circle-exclamation' : 'fas fa-check-circle';
    els['toast'].classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els['toast'].classList.remove('show'), 3000);
}

function formatPrice(v) {
    const n = Number(v) || 0;
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
