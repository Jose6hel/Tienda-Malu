import { db, storage } from '../core/firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sanitize } from '../core/router.js';

const ADMIN_WHITELIST = [
    "mariaveranodevalencia@gmail.com",
    "josegamer18901@gmail.com",
    "jos3davidortizverano2009@gmail.com"
];

export async function renderAdmin(container, currentUserEmail) {
    if (!currentUserEmail || !ADMIN_WHITELIST.map(e => e.toLowerCase()).includes(currentUserEmail.toLowerCase())) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <p style="color:#EF4444; font-weight:700; font-size:1.2rem;">Acceso Restringido</p>
                <p style="color:var(--text-muted); margin-top:8px;">No tienes permisos de administración.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="admin-wrapper" style="padding: 16px;">
            <aside id="admin-sidebar" style="background:var(--surface); padding:16px; border-radius:var(--radius); border:1px solid var(--border); display:flex; flex-wrap:wrap; gap:8px; margin-bottom: 20px;">
                <h3 style="width:100%; margin-bottom:10px; font-size: 1.1rem; font-weight: 700;">Malu Control Panel</h3>
                <button class="btn admin-tab-btn" id="tab-products" style="background:transparent; color:var(--text); padding:8px 12px; border-radius: 6px; border: 1px solid var(--border); cursor: pointer; font-size:13px;">📦 Productos</button>
                <button class="btn admin-tab-btn" id="tab-categories" style="background:transparent; color:var(--text); padding:8px 12px; border-radius: 6px; border: 1px solid var(--border); cursor: pointer; font-size:13px;">📁 Categorías</button>
                <button class="btn admin-tab-btn" id="tab-announcements" style="background:transparent; color:var(--text); padding:8px 12px; border-radius: 6px; border: 1px solid var(--border); cursor: pointer; font-size:13px;">📢 Anuncios</button>
                <button class="btn admin-tab-btn" id="tab-analytics" style="background:transparent; color:var(--text); padding:8px 12px; border-radius: 6px; border: 1px solid var(--border); cursor: pointer; font-size:13px;">📈 Analíticas</button>
            </aside>
            
            <section id="admin-content" style="background:var(--surface); padding:20px; border-radius:var(--radius); border:1px solid var(--border); min-height: 400px; width: 100%; box-sizing: border-box;">
            </section>
        </div>

        <style>
            @media (min-width: 768px) {
                .admin-wrapper { display: grid; grid-template-columns: 240px 1fr; gap: 24px; padding: 16px 0; }
                #admin-sidebar { flex-direction: column; flex-wrap: nowrap; margin-bottom: 0; align-self: start; }
            }
        </style>
    `;

    const contentArea = document.getElementById('admin-content');
    const tabs = document.querySelectorAll('.admin-tab-btn');

    const switchTabHighlight = (activeId) => {
        tabs.forEach(btn => {
            if (btn.id === activeId) {
                btn.style.background = 'rgba(168, 85, 247, 0.1)';
                btn.style.color = 'var(--primary)';
                btn.style.borderColor = 'var(--primary)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text)';
                btn.style.borderColor = 'var(--border)';
            }
        });
    };
    
    document.getElementById('tab-products').onclick = () => { switchTabHighlight('tab-products'); showProductManagement(contentArea); };
    document.getElementById('tab-categories').onclick = () => { switchTabHighlight('tab-categories'); showCategoryManagement(contentArea); };
    document.getElementById('tab-announcements').onclick = () => { switchTabHighlight('tab-announcements'); showAnnouncementManagement(contentArea); };
    document.getElementById('tab-analytics').onclick = () => { switchTabHighlight('tab-analytics'); showAnalyticsManagement(contentArea); };

    switchTabHighlight('tab-products');
    showProductManagement(contentArea);
}

// Nota: Las funciones showProductManagement, showCategoryManagement, etc., 
// deben mantenerse igual que las tenías. Solo asegúrate de que sus 
// formularios internos usen `width: 100%` y `box-sizing: border-box` 
// para no desbordar en móvil.

async function showProductManagement(target) {
    target.innerHTML = `
        <h2 id="form-title" style="margin-bottom:20px; font-size: 1.4rem; font-weight: 700;">Agregar Producto</h2>
        <form id="form-add-product" style="margin-bottom:40px; display:flex; flex-direction:column; gap:16px;">
            <div class="form-group">
                <label style="font-weight:600; font-size:14px;">Nombre *</label>
                <input type="text" id="p-name" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); box-sizing:border-box;" required>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="number" id="p-price" placeholder="Precio" style="padding:10px; border-radius:6px; border:1px solid var(--border); box-sizing:border-box;" required>
                <input type="number" id="p-original-price" placeholder="Precio Antes" style="padding:10px; border-radius:6px; border:1px solid var(--border); box-sizing:border-box;">
            </div>
            <button type="submit" id="btn-submit-form" class="btn btn-primary" style="padding:12px;">Guardar Producto</button>
        </form>
        <div id="admin-products-list"></div>
    `;
    // ... resto de tu lógica de carga de productos (loadInventory, etc.)
}

// Asegúrate de aplicar 'box-sizing: border-box' y 'width: 100%' 
// a todos los inputs y contenedores internos para evitar desbordamientos.