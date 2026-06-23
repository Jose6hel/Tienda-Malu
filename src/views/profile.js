import { store } from '../core/store.js';
import { sanitize } from '../core/router.js';

/**
 * Renderiza la vista de Perfil de Usuario con su historial de navegación.
 * @param {HTMLElement} container - Contenedor principal donde se inyectará la vista.
 */
export function renderProfile(container) {
    if (!container) return;

    const { user } = store.state;

    // 1. Si el usuario no ha iniciado sesión
    if (!user) {
        container.innerHTML = `
            <div style="max-width: 500px; margin: 60px auto; padding: 32px; text-align: center; background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); color: var(--text);">
                <span style="font-size: 4rem;">🔒</span>
                <h2 style="margin: 16px 0 8px 0; font-weight: 700;">Acceso Restringido</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.5;">
                    Para ver tu perfil, configurar tu avatar y revisar tu historial de productos visitados, necesitas ingresar a tu cuenta.
                </p>
                <button class="btn btn-primary" id="profile-login-btn" style="width: 100%; padding: 12px;">Ingresar con mi Correo</button>
            </div>
        `;

        document.getElementById('profile-login-btn').onclick = () => {
            const loginBtn = document.getElementById('btn-login-modal') || document.getElementById('btn-login-mobile');
            if (loginBtn) loginBtn.click();
        };
        return;
    }

    // 2. Si el usuario está autenticado
    const avatarUrl = user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + (user.email || 'invitado');
    
    let recentProducts = [];
    try {
        recentProducts = JSON.parse(localStorage.getItem('recent_views')) || [];
    } catch (e) {
        recentProducts = [];
    }

    // Renderizado local e independiente (Agregamos data-product-id para el manejo del enrutador SPA)
    let historyHtml = '';
    if (recentProducts.length === 0) {
        historyHtml = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 40px 0;">Aún no has visitado ningún producto recientemente.</p>`;
    } else {
        historyHtml = recentProducts.map(product => {
            const displayImage = product.images && product.images.length > 0 ? product.images[0] : (product.imageUrl || '');
            return `
                <div class="card" style="cursor: pointer; display: flex; flex-direction: column;" data-product-id="${product.id}">
                    <div class="card-img-wrapper" style="overflow: hidden; height: 180px;">
                        <img src="${displayImage}" alt="${sanitize(product.name)}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="card-body" style="padding: 12px; display: flex; flex-direction: column; flex-grow: 1;">
                        <h3 style="font-size: 0.95rem; font-weight: 600; margin: 4px 0; color: var(--text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.4em;">${sanitize(product.name)}</h3>
                        <p class="product-price" style="font-weight: 700; color: var(--primary); margin-top: auto;">$${product.price.toLocaleString()}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    container.innerHTML = `
        <div style="max-width: 1000px; margin: 30px auto; padding: 0 16px; display: flex; flex-direction: column; gap: 32px;">
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 24px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; box-shadow: var(--shadow);">
                <div style="position: relative;">
                    <img id="profile-avatar-img" src="${avatarUrl}" alt="Avatar" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary);">
                    <button id="btn-edit-avatar" style="position: absolute; bottom: 0; right: 0; background: var(--primary); color: white; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;" title="Cambiar foto">✏️</button>
                </div>
                <div style="flex-grow: 1;">
                    <h2 style="margin: 0 0 4px 0; font-size: 1.4rem; font-weight: 700; color: var(--text);">¡Hola de nuevo!</h2>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem; font-weight: 500;">
                        📧 Correo: <span style="color: var(--text); font-weight: 600;">${sanitize(user.email)}</span>
                    </p>
                </div>
            </div>

            <div>
                <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 16px; color: var(--text); display: flex; align-items: center; gap: 8px;">
                    <span>🕒</span> Vistos Recientemente
                </h3>
                <div class="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
                    ${historyHtml}
                </div>
            </div>
        </div>
    `;

    // Capturar clics de navegación SPA interna en las tarjetas del historial
    container.querySelectorAll('.card[data-product-id]').forEach(card => {
        card.onclick = (e) => {
            e.preventDefault();
            const productId = card.dataset.productId;
            
            // Cambiar URL en la barra de direcciones de forma virtual
            window.history.pushState({}, "", `/product?id=${productId}`);
            
            // Notificar al enrutador global que procese la nueva vista
            window.dispatchEvent(new Event('popstate'));
        };
    });

    // Evento para editar foto de perfil
    document.getElementById('btn-edit-avatar').onclick = async () => {
        const newPhotoUrl = prompt("Introduce la URL de tu nueva foto de perfil:", user.photoURL || "");
        if (newPhotoUrl !== null) {
            try {
                if (window.firebase) {
                    const authUser = window.firebase.auth().currentUser;
                    if (authUser) await authUser.updateProfile({ photoURL: newPhotoUrl });
                }
                store.setState({ user: { ...user, photoURL: newPhotoUrl } });
                alert("¡Foto de perfil actualizada con éxito!");
            } catch (error) {
                alert("No se pudo actualizar el avatar: " + error.message);
            }
        }
    };
}

export function trackVisitedProduct(product) {
    if (!product || !product.id) return;
    try {
        let currentViews = JSON.parse(localStorage.getItem('recent_views')) || [];
        currentViews = currentViews.filter(p => p.id !== product.id);
        currentViews.unshift(product);
        if (currentViews.length > 4) currentViews.pop();
        localStorage.setItem('recent_views', JSON.stringify(currentViews));
    } catch (e) {
        console.error(e);
    }
}