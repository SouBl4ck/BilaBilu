(function() {
    // ============================================================
    //  ⚙️  CONFIGURAÇÃO — altere o número do WhatsApp aqui
    // ============================================================
    const WHATSAPP_NUMBER = '5511992549400'; // ← troque pelo número real
    // ============================================================

    // ===== ESTADO GLOBAL =====
    let productsData = { fe: [], bebe: [], personagens: [] };
    let allProducts = {};      // mapa id → produto
    let cart = [];             // [{ id, qty }]
    let loaded = false;        // flag para saber se os produtos foram carregados

    // ===== UTILIDADES =====
    function formatBRL(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function showToast(msg) {
        const toast = document.getElementById('toast');
        document.getElementById('toast-msg').textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // ===== CARRINHO =====
    function getCartTotal() {
        return cart.reduce((acc, item) => acc + (allProducts[item.id]?.price || 0) * item.qty, 0);
    }
    function getCartCount() {
        return cart.reduce((acc, item) => acc + item.qty, 0);
    }

    function addToCart(productId) {
        if (!allProducts[productId]) return;
        const existing = cart.find(i => i.id === productId);
        if (existing) {
            existing.qty++;
        } else {
            cart.push({ id: productId, qty: 1 });
        }
        renderCart();
        updateBadge();
        showToast(`"${allProducts[productId].title}" adicionado! 🛒`);
    }

    function removeFromCart(productId) {
        cart = cart.filter(i => i.id !== productId);
        renderCart();
        updateBadge();
    }

    function changeQty(productId, delta) {
        const item = cart.find(i => i.id === productId);
        if (!item) return;
        item.qty += delta;
        if (item.qty <= 0) removeFromCart(productId);
        else { renderCart(); updateBadge(); }
    }

    function clearCart() {
        if (confirm('Deseja limpar o carrinho?')) {
            cart = [];
            renderCart();
            updateBadge();
        }
    }

    function updateBadge() {
        const count = getCartCount();
        const badge = document.getElementById('cart-badge');
        badge.textContent = count;
        badge.classList.toggle('visible', count > 0);
    }

    function renderCart() {
        const list = document.getElementById('cart-items-list');
        const footer = document.getElementById('cart-footer');
        const summary = document.getElementById('cart-summary');

        list.innerHTML = '';

        if (cart.length === 0) {
            list.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-bag"></i>
                    <p>Seu carrinho está vazio.<br>Adicione peças lindas para começar! 🌸</p>
                </div>`;
            footer.style.display = 'none';
            return;
        }

        footer.style.display = 'block';

        cart.forEach(item => {
            const product = allProducts[item.id];
            if (!product) return;
            const subtotal = product.price * item.qty;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-img-placeholder">🧶</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${product.title}</div>
                    <div class="cart-item-price">${formatBRL(subtotal)}</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" data-action="dec" data-id="${product.id}">−</button>
                        <span class="qty-value">${item.qty}</span>
                        <button class="qty-btn" data-action="inc" data-id="${product.id}">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" data-remove="${product.id}" title="Remover">
                    <i class="fas fa-times"></i>
                </button>
            `;
            list.appendChild(div);
        });

        const total = getCartTotal();
        const count = getCartCount();
        summary.innerHTML = `
            <div class="cart-summary-row">
                <span>${count} ${count === 1 ? 'item' : 'itens'}</span>
                <span>${formatBRL(total)}</span>
            </div>
            <div class="cart-summary-total">
                <span>Total</span>
                <span>${formatBRL(total)}</span>
            </div>
        `;

        buildWhatsAppLink();
    }

    function buildWhatsAppLink() {
        const lines = ['🛒 *MEU PEDIDO – BilaBilu Crochê*', ''];
        cart.forEach(item => {
            const p = allProducts[item.id];
            if (!p) return;
            const subtotal = formatBRL(p.price * item.qty);
            lines.push(`• ${item.qty}x ${p.title} — ${subtotal}`);
        });
        lines.push('');
        lines.push(`━━━━━━━━━━━━━━`);
        lines.push(`💰 *Total: ${formatBRL(getCartTotal())}*`);
        lines.push('');
        lines.push('Aguardo confirmação e instruções de pagamento! 🌸');

        const msg = encodeURIComponent(lines.join('\n'));
        document.getElementById('btn-whatsapp').href =
            `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    }

    // ===== EVENTOS DO CARRINHO =====
    document.getElementById('cart-float-btn').addEventListener('click', openCart);
    document.getElementById('cart-close-btn').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('btn-clear-cart').addEventListener('click', clearCart);

    document.getElementById('cart-items-list').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        const rem = e.target.closest('[data-remove]');
        if (btn) {
            const id = parseInt(btn.dataset.id);
            btn.dataset.action === 'inc' ? changeQty(id, 1) : changeQty(id, -1);
        }
        if (rem) removeFromCart(parseInt(rem.dataset.remove));
    });

    function openCart() {
        document.getElementById('cart-panel').classList.add('open');
        document.getElementById('cart-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeCart() {
        document.getElementById('cart-panel').classList.remove('open');
        document.getElementById('cart-overlay').classList.remove('open');
        document.body.style.overflow = '';
    }

    // ===== HELPERS DE TEXTO =====
    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function shortDesc(text) {
        if (!text) return '';
        const firstLine = text.split('\n').find(l => l.trim()) || '';
        return firstLine.length > 110 ? firstLine.slice(0, 107) + '...' : firstLine;
    }
    function whatsappLinkFor(product) {
        const msg = `Olá! Tenho interesse no produto *${product.title}* (${formatBRL(product.price)}). Pode me passar mais informações?`;
        return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    }

    // ===== RENDERIZAÇÃO DOS PRODUTOS =====
    function renderProducts(containerId, items) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        if (!items.length) {
            container.innerHTML = '<p style="text-align:center; padding:2rem; color:#8c6b66;">Nenhum produto nesta categoria.</p>';
            return;
        }
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.id = item.id;
            card.dataset.title = (item.title || '').toLowerCase();
            card.dataset.cat = item.category || '';
            card.innerHTML = `
                <span class="product-badge"><i class="fas fa-hand-holding-heart"></i> Sob encomenda</span>
                <div class="product-image"><img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy"></div>
                <div class="product-info">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(shortDesc(item.description))}</p>
                    <span class="price">${formatBRL(item.price)}</span>
                    <span class="price-hint"><i class="fas fa-truck"></i> Frete calculado por CEP</span>
                    <div class="product-actions">
                        <button class="btn view-product" data-id="${item.id}">
                            <i class="fas fa-eye"></i> Ver Detalhes
                        </button>
                        <button class="btn-add-cart" data-addcart="${item.id}">
                            <i class="fas fa-shopping-bag"></i> Carrinho
                        </button>
                        <a class="btn-whatsapp-card" href="${whatsappLinkFor(item)}" target="_blank" rel="noopener" data-wa="${item.id}">
                            <i class="fab fa-whatsapp"></i> Comprar
                        </a>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // ===== CARREGAR PRODUTOS DO JSON =====
    function loadProducts() {
        fetch('products.json')
            .then(response => {
                if (!response.ok) throw new Error('Falha ao carregar produtos');
                return response.json();
            })
            .then(data => {
                const products = data.products;
                // Organizar por categoria
                productsData = {
                    fe: products.filter(p => p.category === 'fe'),
                    bebe: products.filter(p => p.category === 'bebe'),
                    personagens: products.filter(p => p.category === 'personagens')
                };
                // Preencher mapa allProducts
                products.forEach(p => allProducts[p.id] = p);

                // Renderizar as seções
                renderProducts('fe-container', productsData.fe);
                renderProducts('bebe-container', productsData.bebe);
                renderProducts('personagens-container', productsData.personagens);

                loaded = true;
                // Recarregar o carrinho (caso já houvesse itens, mas não havia produtos carregados)
                renderCart();
            })
            .catch(error => {
                console.error('Erro ao carregar produtos:', error);
                // Mostrar mensagem amigável nas seções
                document.querySelectorAll('.products').forEach(container => {
                    container.innerHTML = '<p style="text-align:center; padding:2rem;">⚠️ Não foi possível carregar os produtos. Tente novamente mais tarde.</p>';
                });
            });
    }

    // ===== MODAL =====
    const modal = document.getElementById('product-modal');
    const modalContent = document.getElementById('modal-content');
    const closeModal = document.querySelector('.close-modal');

    const CATEGORY_LABELS = {
        fe:          'Cantinho da fé',
        bebe:        'Cantinho do bebê',
        personagens: 'Personagens'
    };

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.view-product');
        if (!trigger) return;
        const id = parseInt(trigger.dataset.id);
        const product = allProducts[id];
        if (!product) return;
        const catLabel = CATEGORY_LABELS[product.category] || product.category || '';
        modalContent.innerHTML = `
            <div class="modal-product">
                <div class="modal-product-img">
                    <img src="${product.image}" alt="${escapeHtml(product.title)}">
                </div>
                <div>
                    ${catLabel ? `<span class="modal-product-cat">${escapeHtml(catLabel)}</span>` : ''}
                    <h2 class="modal-product-title">${escapeHtml(product.title)}</h2>
                    <p class="modal-product-desc">${escapeHtml(product.description || '')}</p>
                    <p class="modal-product-price">${formatBRL(product.price)}</p>
                    <span class="modal-price-hint">Pagamento combinado via WhatsApp</span>
                    <div class="modal-meta">
                        <span class="modal-meta-item"><i class="fas fa-hand-holding-heart"></i> Sob encomenda</span>
                        <span class="modal-meta-item"><i class="fas fa-truck"></i> Frete por CEP</span>
                        <span class="modal-meta-item"><i class="fas fa-gem"></i> 100% algodão</span>
                    </div>
                    <div class="modal-actions">
                        <button class="btn" data-addcart="${product.id}">
                            <i class="fas fa-shopping-bag"></i> Carrinho
                        </button>
                        <a class="btn-whatsapp-card" href="${whatsappLinkFor(product)}" target="_blank" rel="noopener">
                            <i class="fab fa-whatsapp"></i> Comprar pelo WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        `;
        modal.classList.add('active');
    });

    closeModal.addEventListener('click', () => modal.classList.remove('active'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Delegação para botões "Adicionar" (nos cards e no modal)
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('[data-addcart]');
        if (addBtn && loaded) {
            addToCart(parseInt(addBtn.dataset.addcart));
            const originalHtml = addBtn.innerHTML;
            addBtn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
            setTimeout(() => { addBtn.innerHTML = originalHtml; }, 1800);
        } else if (addBtn && !loaded) {
            showToast('Aguarde, produtos estão carregando...');
        }
    });

    // ===== LOADER =====
    window.addEventListener('load', function() {
        loadProducts(); // carrega os produtos
        document.getElementById('loader').classList.add('hidden');
        setTimeout(() => document.getElementById('loader').style.display = 'none', 600);
    });

    // ===== ANO =====
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // ===== MOSTRAR MAIS =====
    const showMoreBtn = document.getElementById('show-more-btn');
    const moreContent = document.getElementById('more-content');
    if (showMoreBtn && moreContent) {
        showMoreBtn.addEventListener('click', () => {
            const hidden = moreContent.style.display === 'none';
            moreContent.style.display = hidden ? 'block' : 'none';
            showMoreBtn.textContent = hidden ? 'Mostrar Menos' : 'Mostrar Mais';
        });
    }

    // ===== BACK TO TOP =====
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        backToTop.classList.toggle('active', window.scrollY > 300);
    });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // ===== ROLAGEM SUAVE =====
    const navLinks = document.querySelectorAll('nav a');
    const nav = document.querySelector('nav');
    if (navLinks.length && nav) {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetEl = document.querySelector(link.getAttribute('href'));
                if (targetEl) {
                    const top = targetEl.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - 10;
                    window.scrollTo({ top, behavior: 'smooth' });
                    history.pushState(null, null, link.getAttribute('href'));
                }
            });
        });
    }

    // ===== BUSCA E FILTROS DO CATÁLOGO =====
    const searchInput   = document.getElementById('catalog-search-input');
    const searchClear   = document.getElementById('catalog-search-clear');
    const filterChips   = document.querySelectorAll('.catalog-chip');
    const sections      = document.querySelectorAll('.catalog-section');
    const emptyState    = document.getElementById('catalog-empty');
    const emptyTerm     = document.getElementById('catalog-empty-term');
    const emptyClearBtn = document.getElementById('catalog-empty-clear');

    let activeFilter = 'all';
    let searchTerm   = '';

    function applyCatalogFilter() {
        const term = searchTerm.trim().toLowerCase();
        let totalVisible = 0;

        sections.forEach(section => {
            const sectionCat = section.id === 'cantinho-fe'   ? 'fe'
                             : section.id === 'cantinho-bebe' ? 'bebe'
                             : section.id === 'personagens'   ? 'personagens'
                             : null;

            const categoryMatch = (activeFilter === 'all' || activeFilter === sectionCat);

            if (!categoryMatch) {
                section.classList.add('hidden-by-filter');
                return;
            }

            const cards = section.querySelectorAll('.product-card');
            let visibleCards = 0;
            cards.forEach(card => {
                const matchesTerm = !term || (card.dataset.title || '').includes(term);
                card.style.display = matchesTerm ? '' : 'none';
                if (matchesTerm) visibleCards++;
            });

            // se a seção tem categoria correspondente mas nenhum card visível pela busca, esconde a seção
            section.classList.toggle('hidden-by-filter', visibleCards === 0);
            totalVisible += visibleCards;
        });

        // estado vazio global
        if (totalVisible === 0) {
            emptyState.hidden = false;
            emptyTerm.textContent = term || (CATEGORY_LABELS[activeFilter] || activeFilter);
        } else {
            emptyState.hidden = true;
        }

        searchClear.hidden = !term;
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            applyCatalogFilter();
        });
    }
    if (searchClear) {
        searchClear.addEventListener('click', () => {
            searchTerm = '';
            searchInput.value = '';
            applyCatalogFilter();
            searchInput.focus();
        });
    }
    if (emptyClearBtn) {
        emptyClearBtn.addEventListener('click', () => {
            searchTerm = '';
            searchInput.value = '';
            activeFilter = 'all';
            filterChips.forEach(c => c.classList.toggle('active', c.dataset.cat === 'all'));
            applyCatalogFilter();
        });
    }
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeFilter = chip.dataset.cat;
            applyCatalogFilter();

            // rola até a seção correspondente, se uma categoria específica foi escolhida
            if (activeFilter !== 'all') {
                const targetId = activeFilter === 'fe' ? 'cantinho-fe'
                              : activeFilter === 'bebe' ? 'cantinho-bebe'
                              : 'personagens';
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    const navEl = document.querySelector('nav');
                    const offset = (navEl ? navEl.offsetHeight : 60) + 80;
                    window.scrollTo({ top: targetEl.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
                }
            }
        });
    });

    // chamada inicial após produtos carregarem
    const filterWatcher = setInterval(() => {
        if (loaded) {
            clearInterval(filterWatcher);
            applyCatalogFilter();
        }
    }, 250);

    // ===== PARTÍCULAS DE FUNDO (sutis, leves, desligadas em mobile) =====
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = document.getElementById('particles-canvas');

    if (canvas && !isCoarsePointer && !isReducedMotion) {
        const ctx = canvas.getContext('2d');
        let particles = [];

        function initParticles() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const count = Math.min(40, Math.floor((canvas.width * canvas.height) / 28000));
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 1 + Math.random() * 2.2,
                speedX: (Math.random() - 0.5) * 0.3,
                speedY: (Math.random() - 0.5) * 0.3,
                color: `rgba(217, 127, 119, ${0.25 + Math.random() * 0.3})`
            }));
        }

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.speedX; p.y += p.speedY;
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            });
            requestAnimationFrame(animateParticles);
        }

        window.addEventListener('resize', initParticles);
        initParticles();
        animateParticles();
    } else if (canvas) {
        canvas.style.display = 'none';
    }

    // Inicializar carrinho vazio (espera o load)
    renderCart();
})();