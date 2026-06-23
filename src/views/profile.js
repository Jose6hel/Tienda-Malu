import { store } from '../core/store.js';
import { sanitize } from '../core/router.js';
import { auth } from '../core/firebase.js';
import { signOut } from "firebase/auth";

/**
 * Renderiza la vista de Perfil de Usuario básica y limpia.
 * @param {HTMLElement} container - Contenedor principal donde se inyectará la vista.
 */
export function renderProfile(container) {
    if (!container) return;

    const { user } = store.state;

    // Si el usuario no ha iniciado sesión
    if (!user) {
        container.innerHTML = `
            <div style="max-width: 500px; margin: 60px auto; padding: 32px; text-align: center; background: var(--surface); border-radius: 8px; box-shadow: var(--shadow); color: var(--text);">
                <span style="font-size: 4rem;">🔒</span>
                <h2 style="margin: 16px 0 8px 0; font-weight: 700;">Acceso Restringido</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.5;">
                    Para ver tu perfil, necesitas ingresar a tu cuenta.
                </p>
                <button class="btn btn-primary" id="profile-login-btn" style="width: 100%; padding: 12px;">
                    Ingresar con mi Correo
                </button>
            </div>
        `;

        document.getElementById('profile-login-btn').onclick = () => {
            const loginBtn =
                document.getElementById('btn-login-modal') ||
                document.getElementById('btn-login-mobile');

            if (loginBtn) loginBtn.click();
        };

        return;
    }

    const avatarUrl =
        'https://api.dicebear.com/7.x/bottts/svg?seed=' +
        (user.email || 'invitado');

    container.innerHTML = `
        <div style="max-width: 600px; margin: 40px auto; padding: 0 16px;">
            <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 32px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 20px; box-shadow: var(--shadow);">

                <div>
                    <img
                        src="${avatarUrl}"
                        alt="Avatar"
                        style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary); background: var(--background);"
                    >
                </div>

                <div>
                    <h2 style="margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 700; color: var(--text);">
                        Tu Cuenta
                    </h2>
                    <p style="margin: 0; color: var(--text-muted); font-size: 1rem;">
                        📧 <span style="color: var(--text); font-weight: 600;">
                            ${sanitize(user.email)}
                        </span>
                    </p>
                </div>

                <hr style="width: 100%; border: 0; border-top: 1px solid var(--border); margin: 8px 0;">

                <button
                    id="btn-logout"
                    class="btn"
                    style="background: #EF4444; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; width: 100%; justify-content: center; transition: background 0.2s;"
                >
                    🚪 Cerrar Sesión
                </button>

            </div>
        </div>
    `;

    const logoutBtn = document.getElementById('btn-logout');

    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            if (confirm("¿Estás seguro de que deseas cerrar tu sesión?")) {
                try {
                    await signOut(auth);

                    store.setState({ user: null });

                    window.history.pushState({}, "", "/");
                    window.dispatchEvent(new Event("popstate"));

                } catch (err) {
                    console.error(err);
                    alert("Error al cerrar sesión: " + err.message);
                }
            }
        };
    }
}