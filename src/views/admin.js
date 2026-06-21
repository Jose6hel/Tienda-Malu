import { db, storage } from '../core/firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sanitize } from '../core/router.js';

export async function renderAdmin(container) {
    container.innerHTML = `
        <div class="admin-grid">
            <aside style="background:var(--surface); padding:20px; border-radius:var(--radius); border:1px solid var(--border); display:flex; flex-direction:column; gap:12px; height:fit-content;">
                <h3 style="margin-bottom:12px;">Malu Control Panel</h3>
                <button class="btn btn-primary" id="tab-products" style="text-align:left; background:transparent; color:var(--text); padding:8px 12px;">📦 Gestionar Productos</button>
                <button class="btn btn-primary" id="tab-announcements" style="text-align:left; background:transparent; color:var(--text); padding:8px 12px;">📢 Marquesina Global</button>
            </aside>
            
            <section id="admin-content" style="background:var(--surface); padding:24px; border-radius:var(--radius); border:1px solid var(--border);">
                </section>
        </div>
    `;

    const contentArea = document.getElementById('admin-content');
    
    document.getElementById('tab-products').onclick = () => showProductManagement(contentArea);
    document.getElementById('tab-announcements').onclick = () => showAnnouncementManagement(contentArea);

    // Inicialización por defecto en la vista de control de catálogo
    showProductManagement(contentArea);
}

async function showProductManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:20px;">Gestión de Productos</h2>
        <form id="form-add-product" style="margin-bottom:40px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group" style="grid-column:1/-1;">
                <label>Nombre del Producto *</label>
                <input type="text" id="p-name" class="form-input" required>
            </div>
            <div class="form-group">
                <label>Precio (COP) *</label>
                <input type="number" id="p-price" class="form-input" required>
            </div>
            <div class="form-group">
                <label>Categoría *</label>
                <select id="p-category" class="form-input">
                    <option value="Celulares">Celulares</option>
                    <option value="Accesorios">Accesorios</option>
                    <option value="Tecnología">Tecnología</option>
                </select>
            </div>
            <div class="form-group" style="grid-column:1/-1;">
                <label>Imagen del Producto</label>
                <input type="file" id="p-image" class="form-input" accept="image/*">
            </div>
            <div style="grid-column:1/-1;">
                <button type="submit" class="btn btn-primary">Guardar Producto en Producción</button>
            </div>
        </form>

        <h3>Productos Activos</h3>
        <div id="admin-products-list" style="margin-top:16px; display:flex; flex-direction:column; gap:12px;">Cargando inventario...</div>
    `;

    const listContainer = document.getElementById('admin-products-list');
    const form = document.getElementById('form-add-product');

    const loadInventory = async () => {
        const snap = await getDocs(collection(db, "products"));
        if (snap.empty) { listContainer.innerHTML = '<p>No hay productos en base de datos.</p>'; return; }
        
        listContainer.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            return `
                <div style="display:flex; justify-content:between; align-items:center; padding:12px; background:var(--background); border-radius:8px; border:1px solid var(--border);">
                    <div style="flex-grow:1;">
                        <strong>${sanitize(data.name)}</strong> - $${data.price.toLocaleString()} [${data.category}]
                    </div>
                    <button class="btn btn-danger btn-delete-p" data-id="${doc.id}" style="width:auto; padding:6px 12px; background:%23EF4444; color:white; border-radius:6px;">Eliminar</button>
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('.btn-delete-p').forEach(btn => {
            btn.onclick = async () => {
                if (confirm("¿Seguro que desea eliminar de forma irreversible este producto?")) {
                    await deleteDoc(doc(db, "products", btn.dataset.id));
                    loadInventory();
                }
            };
        });
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const file = document.getElementById('p-image').files[0];
        let imageUrl = "";

        try {
            if (file) {
                const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(uploadResult.ref);
            }

            await addDoc(collection(db, "products"), {
                name: document.getElementById('p-name').value,
                price: parseFloat(document.getElementById('p-price').value),
                category: document.getElementById('p-category').value,
                imageUrl: imageUrl,
                createdAt: new Date()
            });

            form.reset();
            alert("Producto guardado exitosamente.");
            loadInventory();
        } catch (error) {
            alert("Error crítico durante el guardado: " + error.message);
        }
    };

    await loadInventory();
}

async function showAnnouncementManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:20px;">Marquesina de Anuncios</h2>
        <div class="form-group">
            <label>Texto Informativo Destacado</label>
            <input type="text" id="announcement-input" class="form-input" placeholder="Ej: ¡Descuento del 10% en accesorios pagando en efectivo!">
        </div>
        <button class="btn btn-primary" id="btn-save-announcement">Actualizar y Publicar Anuncio</button>
    `;

    const input = document.getElementById('announcement-input');
    const btn = document.getElementById('btn-save-announcement');

    const snap = await getDocs(collection(db, "announcements"));
    let existingDocId = null;
    if (!snap.empty) {
        existingDocId = snap.docs[0].id;
        input.value = snap.docs[0].data().text;
    }

    btn.onclick = async () => {
        const text = input.value.trim();
        if (!text) return alert("Por favor escriba un texto válido.");

        try {
            if (existingDocId) {
                await updateDoc(doc(db, "announcements", existingDocId), { text: text, active: true });
            } else {
                await addDoc(collection(db, "announcements"), { text: text, active: true });
            }
            alert("Marquesina global de anuncios actualizada en tiempo real.");
        } catch (e) {
            alert("Error al actualizar la marquesina: " + e.message);
        }
    };
}