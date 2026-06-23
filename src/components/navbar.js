import { store } from '../core/store.js';
import { sendMagicLink, logout } from '../core/auth.js';
import { sanitize } from '../core/router.js';

export function renderNavbar() {
    const nav = document.getElementById('main-navbar');
    const { user, role, cart, theme } = store.state;
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    document.documentElement.setAttribute('data-theme', theme);

    // Imagen de perfil dinámica basada en el correo del usuario conectado o un avatar por defecto
    const avatarUrl = user?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (user?.email || 'invitado');

    nav.innerHTML = `
        <nav class="navbar nav-desktop" style="box-shadow: 0 2px 4px rgba(168, 85, 247, 0.05); position: sticky; top: 0; z-index: 100; background: var(--surface);">
            <a href="/" class="nav-logo" data-link>TIENDA MALU</a>
            <div class="nav-actions">
                <button class="btn-icon" id="theme-toggle" style="transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">${theme === 'light' ? '🌙' : '☀️'}</button>
                <button class="btn-icon" id="cart-toggle" style="transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🛒 <span class="badge">${totalItems}</span></button>
                
                ${role === 'admin' ? '<a href="/admin" class="btn btn-primary" style="padding:6px 12px; font-size:14px;" data-link>Panel</a>' : ''}
                
                ${user ? `
                    <a href="/profile" data-link style="display: flex; align-items: center; gap: 6px; text-decoration: none; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border);">
                        <img src="${avatarUrl}" alt="Perfil" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
                        <span style="font-size: 13px; color: var(--text); max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sanitize(user.email.split('@')[0])}</span>
                    </a>
                    <button class="btn btn-primary" id="btn-logout" style="padding:6px 12px; font-size:14px; background:#475569;">Salir</button>
                ` : `
                    <button class="btn btn-primary" id="btn-login-modal" style="padding:6px 12px; font-size:14px;">Ingresar</button>
                `}
            </div>
        </nav>

        <nav class="nav-mobile-tabs" style="position: fixed; bottom: 0; left: 0; width: 100%; background: var(--surface); border-top: 1px solid var(--border); display: flex; justify-content: space-around; align-items: center; padding: 8px 0; z-index: 100; box-shadow: 0 -2px 10px rgba(0,0,0,0.05);">
            <div onclick="window.location.href='/'" style="display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer;">
                <span style="font-size: 18px;">🏠</span>
                <span style="font-size: 11px; color: var(--text); font-weight: 500;">Inicio</span>
            </div>

            <div id="cart-toggle-mobile" style="display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; position: relative;">
                <span style="font-size: 18px;">🛒</span>
                <span style="font-size: 11px; color: var(--text); font-weight: 500;">Carrito</span>
                ${totalItems > 0 ? `<span class="badge" style="position: absolute; top: -4px; right: -4px; background: #EF4444; color: white; border-radius: 50%; min-width: 16px; height: 16px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${totalItems}</span>` : ''}
            </div>

            <div id="theme-toggle-mobile" style="display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer;">
                <span style="font-size: 18px;">${theme === 'light' ? '🌙' : '☀️'}</span>
                <span style="font-size: 11px; color: var(--text); font-weight: 500;">Tema</span>
            </div>

            ${user ? `
                <div onclick="window.location.href='/profile'" style="display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer;">
                    <img src="${avatarUrl}" alt="Perfil" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; border: 1px solid var(--primary);">
                    <span style="font-size: 11px; color: var(--text); font-weight: 500;">Perfil</span>
                </div>
            ` : `
                <div id="btn-login-mobile" style="display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer;">
                    <span style="font-size: 18px;">🔑</span>
                    <span style="font-size: 11px; color: var(--text); font-weight: 500;">Ingresar</span>
                </div>
            `}
        </nav>

        <style>
            @media (max-width: 768px) {
                .nav-desktop { display: none !important; }
                body { padding-bottom: 64px !important; } /* Margen inferior para que las pestañas no tapen el contenido */
            }
            @media (min-width: 769px) {
                .nav-mobile-tabs { display: none !important; }
            }
        </style>
    `;

    // Renderizado del Sidebar del Carrito
    renderCartSidebar();

    // --- Vinculación de Eventos (Soporte Escritorio y Móvil sin alterar lógica) ---

    // Manejo de Cambio de Tema (Escritorio)
    document.getElementById('theme-toggle').onclick = () => toggleAppTheme(theme);

    // Manejo de Cambio de Tema (Móvil)
    document.getElementById('theme-toggle-mobile').onclick = () => toggleAppTheme(theme);

    // Abrir Carrito (Escritorio)
    document.getElementById('cart-toggle').onclick = () => {
        document.getElementById('cart-sidebar').classList.add('open');
    };

    // Abrir Carrito (Móvil)
    document.getElementById('cart-toggle-mobile').onclick = () => {
        document.getElementById('cart-sidebar').classList.add('open');
    };

    // Botón Salir (Solo si está autenticado)
    if (document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').onclick = logout;
    }

    // Botón Ingresar (Escritorio)
    if (document.getElementById('btn-login-modal')) {
        document.getElementById('btn-login-modal').onclick = showLoginPrompt;
    }

    // Botón Ingresar (Móvil)
    if (document.getElementById('btn-login-mobile')) {
        document.getElementById('btn-login-mobile').onclick = showLoginPrompt;
    }
}

// Función auxiliar para centralizar la conmutación de temas
function toggleAppTheme(currentTheme) {
    const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', nextTheme);
    store.setState({ theme: nextTheme });
}

function showLoginPrompt() {
    const email = prompt("Ingresa tu correo electrónico para enviarte un enlace mágico de acceso:");
    if (email) {
        sendMagicLink(email)
            .then(() => alert("¡Enlace enviado! Revisa tu bandeja de entrada."))
            .catch(err => alert("Error enviando enlace: " + err.message));
    }
}

function renderCartSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    const { cart } = store.state;
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    sidebar.innerHTML = `
        <div class="cart-header">
            <h2>Tu Carrito</h2>
            <button class="btn-icon" id="cart-close" style="font-size: 1.2rem;">✕</button>
        </div>
        <div class="cart-items">
            ${cart.length === 0 ? '<p style="text-align:center; margin-top:40px; color:var(--text-muted);">El carrito está vacío.</p>' : cart.map(item => `
                <div class="cart-item" style="animation: fadeIn 0.3s ease;">
                    <div style="flex-grow:1;">
                        <h4 style="font-weight: 600; margin-bottom: 2px;">${sanitize(item.name)}</h4>
                        <p class="product-price" style="font-size: 1rem; margin-bottom: 6px;">$${item.price.toLocaleString()}</p>
                        <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                            <button class="btn-qty" data-id="${item.id}" data-action="dec" style="width:28px; height:28px; border:1px solid var(--border); background:var(--background); border-radius:4px; cursor:pointer; font-weight:bold; color:var(--text);">-</button>
                            <span style="width:32px; text-align:center; font-weight:600; font-size:0.9rem;">${item.quantity}</span>
                            <button class="btn-qty" data-id="${item.id}" data-action="inc" style="width:28px; height:28px; border:1px solid var(--border); background:var(--background); border-radius:4px; cursor:pointer; font-weight:bold; color:var(--text);">+</button>
                        </div>
                    </div>
                    <button class="btn-icon remove-item" data-id="${item.id}" style="font-size: 1.1rem; align-self: flex-start; opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">🗑️</button>
                </div>
            `).join('')}
        </div>
        <div class="cart-footer" style="background: linear-gradient(to top, var(--surface) 80%, transparent);">
            <h3 style="display:flex; justify-content:space-between; margin-bottom:16px; font-weight:700;">
                <span>Total:</span> <span>$${total.toLocaleString()}</span>
            </h3>
            
            ${cart.length > 0 ? `
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 500;">Selecciona un asesor para enviar tu pedido:</p>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button class="btn btn-primary btn-whatsapp-checkout" data-number="+573235770700" style="background-color: #25D366; color: white; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>💬</span> Enviar a Asesor 1
                    </button>
                    <button class="btn btn-primary btn-whatsapp-checkout" data-number="+573166418221" style="background-color: #128C7E; color: white; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <span>💬</span> Enviar a Asesor 2
                    </button>
                </div>
            ` : `
                <button class="btn btn-primary" disabled style="opacity: 0.5;">Carrito Vacío</button>
            `}
        </div>
    `;

    // Eventos del Carrito
    document.getElementById('cart-close').onclick = () => sidebar.classList.remove('open');

    sidebar.querySelectorAll('.btn-qty').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            const item = cart.find(i => i.id === id);
            if (item) {
                store.updateCartQuantity(id, action === 'inc' ? item.quantity + 1 : item.quantity - 1);
            }
        };
    });

    sidebar.querySelectorAll('.remove-item').forEach(btn => {
        btn.onclick = () => store.removeFromCart(btn.dataset.id);
    });

    // Eventos para el checkout manual de asesores
    sidebar.querySelectorAll('.btn-whatsapp-checkout').forEach(btn => {
        btn.onclick = () => {
            const phoneNumber = btn.dataset.number;
            handleCheckout(phoneNumber);
        };
    });
}

function handleCheckout(chosenNumber) {
    const { cart } = store.state;
    if (cart.length === 0) return;
    
    let message = `*NUEVO PEDIDO - TIENDA MALU*\n`;
    message += `Fecha: ${new Date().toLocaleDateString()}\n`;
    message += `----------------------------------------\n`;
    
    cart.forEach(item => {
        message += `• ${item.name} (Cant: ${item.quantity}) - $${(item.price * item.quantity).toLocaleString()}\n`;
    });
    
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    message += `----------------------------------------\n`;
    message += `*TOTAL A PAGAR:* $${total.toLocaleString()}\n\n`;
    message += `Por favor, confírmeme la disponibilidad para coordinar el despacho.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?phone=${chosenNumber}&text=${encoded}`, '_blank');
}