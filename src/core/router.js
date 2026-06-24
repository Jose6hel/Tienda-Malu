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

// Lista de correos autorizados como Administradores
const ADMIN_EMAILS = [
    'jos3davidortizverano2009@gmail.com',
    'mariaveranodevalencia@gmail.com'
];

const routes = {
    '/': renderHome,
    '/product': renderProductDetail,
    '/admin': renderAdmin,
    '/profile': renderProfile,
    '/perfil': renderProfile // Soporte por si en el navbar se configuró en español
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

    // Limpiamos la ruta para evitar errores por barras diagonales al final (ej: /admin/ -> /admin)
    let path = window.location.pathname;
    if (path.length > 1 && path.endsWith('/')) {
        path = path.slice(0, -1);
    }

    const currentUser = store.state.user;

    // Validación estricta de rutas protegidas (Panel Admin)
    if (path.startsWith('/admin')) {
        // 1. Si ni siquiera está logueado, redirige a la Home
        if (!currentUser) {
            window.history.pushState({}, "", "/");
            router();
            return;
        }
        
        // 2. Si está logueado pero su correo NO está en la lista de admins
        if (!ADMIN_EMAILS.includes(currentUser.email)) {
            alert("Acceso denegado: No tienes permisos de administrador.");
            window.history.pushState({}, "", "/");
            router();
            return;
        }
    }

    renderNavbar();
    
    // Buscar la función de la vista, si no existe redirige a Home
    const viewFunction = routes[path] || routes['/'];
    
    const root = document.getElementById('app-root');
    if (root) {
        root.innerHTML = ''; 
        // Renderizamos la vista pasándole el contenedor y el email del usuario activo
        await viewFunction(root, currentUser?.email);
    }
}

// Suscripción al sistema de anuncios en tiempo real (Firestore Realtime)
function initAnnouncements() {
    const q = query(collection(db, "announcements"), where("active", "==", true));
    onSnapshot(q, (snapshot) => {
        const bar = document.getElementById('announcement-bar');
        const textNode = document.getElementById('announcement-text');
        if (bar && textNode) {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                textNode.textContent = data.text;
                bar.classList.remove('hidden');
            } else {
                bar.classList.add('hidden');
            }
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