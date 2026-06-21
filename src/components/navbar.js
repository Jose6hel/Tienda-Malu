import { store } from '../core/store.js';
import { sendMagicLink, logout } from '../core/auth.js';
import { sanitize } from '../core/router.js';

export function renderNavbar() {
    const nav = document.getElementById('main-navbar');
    const { user, role, cart, theme } = store.state;
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

    document.documentElement.setAttribute('data-theme', theme);

    nav.innerHTML = `
        <nav class="navbar">
            <a href="/" class="nav-logo" data-link>TIENDA MALU</a>
            <div class="nav-actions">
                <button class="btn-icon" id="theme-toggle">${theme === 'light' ? '🌙' : '☀️'}</button>
                <button class="btn-icon" id="cart-toggle">🛒 <span class="badge">${totalItems}</span></button>
                ${role === 'admin' ? '<a href="/admin" class="btn btn-primary" style="padding:6px 12px; font-size:14px;" data-link>Panel</a>' : ''}
                ${user ? `
                    <button class="btn btn-primary" id="btn-logout" style="padding:6px 12px; font-size:14px; background:#475569;">Salir</button>
                ` : `
                    <button class="btn btn-primary" id="btn-login-modal" style="padding:6px 12px; font-size:14px;">Ingresar</button>
                `}
            </div>
        </nav>
    `;

    // Renderizado del Sidebar del Carrito
    renderCartSidebar();

    // Eventos del Navbar
    document.getElementById('theme-toggle').onclick = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', nextTheme);
        store.setState({ theme: nextTheme });
    };

    document.getElementById('cart-toggle').onclick = () => {
        document.getElementById('cart-sidebar').classList.add('open');
    };

    if (document.getElementById('btn-logout')) {
        document.getElementById('btn-logout').onclick = logout;
    }

    if (document.getElementById('btn-login-modal')) {
        document.getElementById('btn-login-modal').onclick = showLoginPrompt;
    }
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
            <button class="btn-icon" id="cart-close">✕</button>
        </div>
        <div class="cart-items">
            ${cart.length === 0 ? '<p>El carrito está vacío.</p>' : cart.map(item => `
                <div class="cart-item">
                    <div style="flex-grow:1;">
                        <h4>${sanitize(item.name)}</h4>
                        <p class="product-price">$${item.price.toLocaleString()}</p>
                        <div style="display:flex; align-items:center; gap:8px; margin-top:8px;">
                            <button class="btn-qty" data-id="${item.id}" data-action="dec">-</button>
                            <span>${item.quantity}</span>
                            <button class="btn-qty" data-id="${item.id}" data-action="inc">+</button>
                        </div>
                    </div>
                    <button class="btn-icon remove-item" data-id="${item.id}">🗑️</button>
                </div>
            `).join('')}
        </div>
        <div class="cart-footer">
            <h3 style="display:flex; justify-content:space-between; margin-bottom:16px;">
                <span>Total:</span> <span>$${total.toLocaleString()}</span>
            </h3>
            <button class="btn btn-primary" id="btn-checkout" ${cart.length === 0 ? 'disabled' : ''}>Finalizar Compra vía WhatsApp</button>
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

    document.getElementById('btn-checkout').onclick = handleCheckout;
}

function handleCheckout() {
    const numbers = ["+573235770700", "+573166418221"];
    const chosenNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const { cart } = store.state;
    
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