import { store } from './store.js';
import { handleSignInWithLink } from './auth.js';
import { renderNavbar } from '../components/navbar.js';
import { renderHome } from '../views/home.js';
import { renderProductDetail } from '../views/product.js';
import { renderAdmin } from '../views/admin.js';
// IMPORTACIÓN NUEVA: Se añade la vista de perfil de usuario
import { renderProfile } from '../views/profile.js';
import { db } from './firebase.js';
import { collection, query, where, onSnapshot } from "firebase/firestore";
// IMPORTACIÓN NUEVA: Módulo de comentarios
import { initCommentsModule } from '../components/comments.js';

const routes = {
    '/': renderHome,
    '/product': renderProductDetail,
    '/admin': renderAdmin,
    '/profile': renderProfile // <-- RUTA NUEVA REGISTRADA CON ÉXITO
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
        // Validación dual: Que tenga rol admin o que su correo esté en la lista autorizada de la vista
        if (!store.state.user) {
            window.history.pushState({}, "", "/");
            router();
            return;
        }
    }

    renderNavbar();
    const viewFunction = routes[path] || routes['/'];
    
    const root = document.getElementById('app-root');
    root.innerHTML = ''; 
    
    // Pasamos el root y el email del usuario actual por si la vista (como Admin o Perfil) necesita validarlo
    await viewFunction(root, store.state.user?.email);
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
        const targetLink = e.target.closest('[data-link]');
        if (targetLink) {
            e.preventDefault();
            window.history.pushState({}, "", targetLink.getAttribute('href'));
            router();
        }
    });
    
    // INICIALIZACIONES AL CARGAR LA APP
    initAnnouncements();
    initCommentsModule(); // Inicializa los listeners de la modal de comentarios una sola vez
    router();
});

store.subscribe(() => {
    renderNavbar();
});