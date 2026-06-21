import { store } from './store.js';
import { handleSignInWithLink } from './auth.js';
import { renderNavbar } from '../components/navbar.js';
import { renderHome } from '../views/home.js';
import { renderProductDetail } from '../views/product.js';
import { renderAdmin } from '../views/admin.js';
import { db } from './firebase.js';
import { collection, query, where, onSnapshot } from "firebase/firestore";

const routes = {
    '/': renderHome,
    '/product': renderProductDetail,
    '/admin': renderAdmin
};

// Sanitización de entradas globales contra ataques XSS
export function sanitize(string) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', "/": '&#x2F;' };
    return string.replace(/[&<>"'/]/g, (s) => map[s]);
}

async function router() {
    const params = new URLSearchParams(window.location.search);

    // Procesar Magic Link de Firebase
    if (params.get('mode') === 'signIn') {
        try {
            await handleSignInWithLink(); 
            window.history.replaceState({}, "", "/");
        } catch (e) {
            alert("Error en validación de enlace de acceso: " + e.message);
        }
    }

    
    const path = window.location.pathname;
    
    

    // Validación estricta de rutas protegidas
    if (path.startsWith('/admin')) {
        if (!store.state.user || store.state.role !== 'admin') {
            window.history.pushState({}, "", "/");
            router();
            return;
        }
    }

    renderNavbar();
    const viewFunction = routes[path] || routes['/'];
    
    const root = document.getElementById('app-root');
    root.innerHTML = ''; 
    await viewFunction(root);
}

// Suscripción al sistema de anuncios en tiempo real (Firestore Realtime)
function initAnnouncements() {
    const q = query(collection(db, "announcements"), where("active", "==", true));
    onSnapshot(q, (snapshot) => {
        const bar = document.getElementById('announcement-bar');
        const textNode = document.getElementById('announcement-text');
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            textNode.textContent = data.text;
            bar.classList.remove('hidden');
        } else {
            bar.classList.add('hidden');
        }
    });
}

window.addEventListener('popstate', router);
document.addEventListener('DOMContentLoaded', () => {
    // Escucha clics en enlaces con atributo de enrutamiento SPA
    document.body.addEventListener('click', e => {
        if (e.target.matches('[data-link]')) {
            e.preventDefault();
            window.history.pushState({}, "", e.target.getAttribute('href'));
            router();
        }
    });
    initAnnouncements();
    router();
});

store.subscribe(() => {
    renderNavbar();
});