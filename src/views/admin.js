import { db, storage } from '../core/firebase.js';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sanitize } from '../core/router.js';

// LISTA DE ADMINISTRADORES AUTORIZADOS
const ADMIN_WHITELIST = [
    "mariaveranodevalencia@gmail.com",
    "josegamer18901@gmail.com" // Autorizado automáticamente para tus pruebas de desarrollo
];

export async function renderAdmin(container, currentUserEmail) {
    // Validación de seguridad por correo
    if (!currentUserEmail || !ADMIN_WHITELIST.map(e => e.toLowerCase()).includes(currentUserEmail.toLowerCase())) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <p style="color:#EF4444; font-weight:700; font-size:1.2rem;">Acceso Restringido</p>
                <p style="color:var(--text-muted); margin-top:8px;">No tienes permisos de administración en Tienda Malu.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="admin-grid" style="display: grid; grid-template-columns: 240px 1fr; gap: 24px; padding: 16px 0;">
            <aside id="admin-sidebar" style="background:var(--surface); padding:20px; border-radius:var(--radius); border:1px solid var(--border); display:flex; flex-direction:column; gap:12px; height:fit-content;">
                <h3 style="margin-bottom:12px; font-size: 1.1rem; font-weight: 700;">Malu Control Panel</h3>
                <button class="btn admin-tab-btn" id="tab-products" style="text-align:left; background:transparent; color:var(--text); padding:10px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">📦 Gestionar Productos</button>
                <button class="btn admin-tab-btn" id="tab-categories" style="text-align:left; background:transparent; color:var(--text); padding:10px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">📁 Gestionar Categorías</button>
                <button class="btn admin-tab-btn" id="tab-announcements" style="text-align:left; background:transparent; color:var(--text); padding:10px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">📢 Marquesina Global</button>
                <button class="btn admin-tab-btn" id="tab-analytics" style="text-align:left; background:transparent; color:var(--text); padding:10px 12px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500;">📈 Analíticas de Popularidad</button>
            </aside>
            
            <section id="admin-content" style="background:var(--surface); padding:24px; border-radius:var(--radius); border:1px solid var(--border); min-height: 400px;">
            </section>
        </div>
    `;

    const contentArea = document.getElementById('admin-content');
    const tabs = document.querySelectorAll('.admin-tab-btn');

    // Función estética para resaltar la pestaña activa en el panel lateral
    const switchTabHighlight = (activeId) => {
        tabs.forEach(btn => {
            if (btn.id === activeId) {
                btn.style.background = 'rgba(168, 85, 247, 0.1)';
                btn.style.color = 'var(--primary)';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text)';
            }
        });
    };
    
    document.getElementById('tab-products').onclick = () => {
        switchTabHighlight('tab-products');
        showProductManagement(contentArea);
    };
    document.getElementById('tab-categories').onclick = () => {
        switchTabHighlight('tab-categories');
        showCategoryManagement(contentArea);
    };
    document.getElementById('tab-announcements').onclick = () => {
        switchTabHighlight('tab-announcements');
        showAnnouncementManagement(contentArea);
    };
    document.getElementById('tab-analytics').onclick = () => {
        switchTabHighlight('tab-analytics');
        showAnalyticsManagement(contentArea);
    };

    // Inicialización por defecto
    switchTabHighlight('tab-products');
    showProductManagement(contentArea);
}

async function showProductManagement(target) {
    target.innerHTML = `
        <h2 id="form-title" style="margin-bottom:20px; font-size: 1.4rem; font-weight: 700;">Agregar Nuevo Producto</h2>
        <form id="form-add-product" style="margin-bottom:40px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div class="form-group" style="grid-column:1/-1;">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Nombre del Producto *</label>
                <input type="text" id="p-name" class="form-input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" required>
            </div>
            <div class="form-group">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Precio Actual (COP) *</label>
                <input type="number" id="p-price" class="form-input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" required>
            </div>
            <div class="form-group">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Precio Antes / Original (Solo para Descuentos)</label>
                <input type="number" id="p-original-price" class="form-input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" placeholder="Ej: 150000">
            </div>
            
            <div class="form-group" style="grid-column:1/-1;">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Categorías del Producto (Selecciona una o varias) *</label>
                <div id="p-categories-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px; background:var(--background); padding:12px; border-radius:6px; border:1px solid var(--border);">
                </div>
            </div>

            <div class="form-group">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Etiqueta Especial</label>
                <select id="p-tag" class="form-input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text); cursor:pointer;">
                    <option value="">Ninguna</option>
                    <option value="Nuevo">Nuevo</option>
                    <option value="Destacado">Destacado</option>
                    <option value="Descuento">Descuento</option>
                </select>
            </div>
            <div class="form-group">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Imágenes del Producto (Puedes seleccionar varias) *</label>
                <input type="file" id="p-image" class="form-input" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" accept="image/*" multiple>
            </div>

            <div class="form-group">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Colores Disponibles (Separados por comas)</label>
                <input type="text" id="p-colors" class="form-input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" placeholder="Ej: Rosado, Blanco, Negro">
            </div>
            <div class="form-group">
                <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Tallas / Tamaños Disponibles (Separados por comas)</label>
                <input type="text" id="p-sizes" class="form-input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" placeholder="Ej: 35, 36, 37, S, M">
            </div>

            <div style="grid-column:1/-1; display:flex; gap:12px; margin-top:8px;">
                <button type="submit" id="btn-submit-form" class="btn btn-primary" style="flex-grow:1; padding:12px;">Guardar Producto en Producción</button>
                <button type="button" id="btn-cancel-edit" class="btn hidden" style="background:#64748B; color:white; width:auto; padding:0 20px; border-radius:6px; border:none; cursor:pointer;">Cancelar</button>
            </div>
        </form>

        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 12px;">Productos Activos</h3>
        <div id="admin-products-list" style="display:flex; flex-direction:column; gap:12px;">Cargando inventario...</div>
    `;

    const listContainer = document.getElementById('admin-products-list');
    const form = document.getElementById('form-add-product');
    const categoriesContainer = document.getElementById('p-categories-container');
    const formTitle = document.getElementById('form-title');
    const btnSubmit = document.getElementById('btn-submit-form');
    const btnCancel = document.getElementById('btn-cancel-edit');

    let localProducts = [];

    const loadCategoriesCheckboxes = async () => {
        const baseCategories = ["Tecnología", "Calzado", "Ropa", "Comida", "Sandalias", "Accesorios"];
        let totalCategories = [...baseCategories];

        try {
            const catSnap = await getDocs(collection(db, "categories"));
            catSnap.forEach(doc => {
                const name = doc.data().name;
                if (name && !totalCategories.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
                    totalCategories.push(name);
                }
            });
        } catch (e) { console.log("Error cargando categorías:", e); }

        categoriesContainer.innerHTML = totalCategories.map(cat => `
            <label style="display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer; color:var(--text);">
                <input type="checkbox" name="product-category" value="${cat}" style="accent-color:var(--primary); width:16px; height:16px;">
                ${cat}
            </label>
        `).join('');
    };

    const loadInventory = async () => {
        const snap = await getDocs(collection(db, "products"));
        if (snap.empty) { listContainer.innerHTML = '<p>No hay productos en base de datos.</p>'; return; }
        
        localProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        listContainer.innerHTML = localProducts.map(p => {
            const tagBadge = p.tag ? `<span style="font-size:10px; background:var(--primary); color:white; padding:2px 6px; border-radius:4px; margin-left:6px;">${p.tag}</span>` : '';
            const displayCat = Array.isArray(p.category) ? p.category.join(', ') : (p.category || 'General');
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--background); border-radius:8px; border:1px solid var(--border);">
                    <div style="flex-grow:1; color: var(--text);">
                        <strong>${sanitize(p.name)}</strong> - $${p.price.toLocaleString()} <span style="color:var(--text-muted)">[${sanitize(displayCat)}]</span> ${tagBadge}
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-edit-p" data-id="${p.id}" style="width:auto; padding:6px 12px; background:var(--primary); color:white; border-radius:6px; border:none; cursor:pointer;">Editar</button>
                        <button class="btn btn-danger btn-delete-p" data-id="${p.id}" style="width:auto; padding:6px 12px; background:#EF4444; color:white; border-radius:6px; border:none; cursor:pointer;">Eliminar</button>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.querySelectorAll('.btn-edit-p').forEach(btn => {
            btn.onclick = () => {
                const prod = localProducts.find(p => p.id === btn.dataset.id);
                if (prod) {
                    formTitle.textContent = "Editar Producto";
                    btnSubmit.textContent = "Actualizar Cambios del Producto";
                    form.setAttribute('data-edit-id', prod.id);
                    btnCancel.classList.remove('hidden');

                    document.getElementById('p-name').value = prod.name;
                    document.getElementById('p-price').value = prod.price;
                    document.getElementById('p-original-price').value = prod.originalPrice || '';
                    document.getElementById('p-tag').value = prod.tag || '';
                    document.getElementById('p-colors').value = prod.colors ? prod.colors.join(', ') : '';
                    document.getElementById('p-sizes').value = prod.sizes ? prod.sizes.join(', ') : '';

                    const activeCats = Array.isArray(prod.category) ? prod.category : [prod.category || 'General'];
                    form.querySelectorAll('input[name="product-category"]').forEach(checkbox => {
                        checkbox.checked = activeCats.includes(checkbox.value);
                    });

                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            };
        });

        listContainer.querySelectorAll('.btn-delete-p').forEach(btn => {
            btn.onclick = async () => {
                if (confirm("¿Seguro que desea eliminar de forma irreversible este producto?")) {
                    await deleteDoc(doc(db, "products", btn.dataset.id));
                    loadInventory();
                }
            };
        });
    };

    btnCancel.onclick = () => {
        form.removeAttribute('data-edit-id');
        form.reset();
        formTitle.textContent = "Agregar Nuevo Producto";
        btnSubmit.textContent = "Guardar Producto en Producción";
        btnCancel.classList.add('hidden');
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const editId = form.getAttribute('data-edit-id');
        const files = document.getElementById('p-image').files;
        let uploadedImages = [];

        const selectedCategories = Array.from(form.querySelectorAll('input[name="product-category"]:checked')).map(cb => cb.value);
        if (selectedCategories.length === 0) {
            alert("Debes seleccionar al menos una categoría para el producto.");
            return;
        }

        const colorsArr = document.getElementById('p-colors').value.split(',').map(c => c.trim()).filter(c => c !== "");
        const sizesArr = document.getElementById('p-sizes').value.split(',').map(s => s.trim()).filter(s => s !== "");

        try {
            if (files.length > 0) {
                for (let i = 0; i < files.length; i++) {
                    const storageRef = ref(storage, `products/${Date.now()}_${files[i].name}`);
                    const uploadResult = await uploadBytes(storageRef, files[i]);
                    const url = await getDownloadURL(uploadResult.ref);
                    uploadedImages.push(url);
                }
            } else if (editId) {
                const currentProd = localProducts.find(p => p.id === editId);
                uploadedImages = currentProd && currentProd.images ? currentProd.images : [currentProd.imageUrl];
            }

            const productData = {
                name: document.getElementById('p-name').value,
                price: parseFloat(document.getElementById('p-price').value),
                originalPrice: document.getElementById('p-original-price').value ? parseFloat(document.getElementById('p-original-price').value) : null,
                category: selectedCategories,
                tag: document.getElementById('p-tag').value,
                images: uploadedImages,
                imageUrl: uploadedImages[0] || "",
                colors: colorsArr,
                sizes: sizesArr,
                updatedAt: new Date()
            };

            if (editId) {
                await updateDoc(doc(db, "products", editId), productData);
                form.removeAttribute('data-edit-id');
                formTitle.textContent = "Agregar Nuevo Producto";
                btnSubmit.textContent = "Guardar Producto en Producción";
                btnCancel.classList.add('hidden');
                alert("Producto modificado correctamente.");
            } else {
                productData.createdAt = new Date();
                productData.views = 0;
                productData.rating = 5.0;
                productData.ratingCount = 0;
                await addDoc(collection(db, "products"), productData);
                alert("Producto guardado exitosamente.");
            }

            form.reset();
            loadInventory();
        } catch (error) {
            alert("Error crítico durante la transacción: " + error.message);
        }
    };

    await loadCategoriesCheckboxes();
    await loadInventory();
}

async function showCategoryManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:20px; font-size:1.4rem; font-weight:700;">Gestión de Categorías Dinámicas</h2>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:16px;">Las categorías base (Tecnología, Calzado, Ropa, Comida, Sandalias, Accesorios) son fijas. Aquí puedes añadir nuevas opciones.</p>
        
        <div class="form-group" style="display:flex; gap:12px; margin-bottom: 24px;">
            <input type="text" id="new-cat-name" class="form-input" style="flex-grow:1; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" placeholder="Ej: Deportes, Mascotas, Joyería">
            <button class="btn btn-primary" id="btn-add-category" style="width:auto; white-space:nowrap; padding: 10px 16px;">+ Agregar Categoría</button>
        </div>

        <h3 style="font-size:1.2rem; font-weight:700; margin-bottom:12px;">Categorías Personalizadas</h3>
        <div id="admin-categories-list" style="display:flex; flex-direction:column; gap:12px;">Cargando categorías...</div>
    `;

    const input = document.getElementById('new-cat-name');
    const btn = document.getElementById('btn-add-category');
    const listContainer = document.getElementById('admin-categories-list');

    const loadCategoriesList = async () => {
        const snap = await getDocs(collection(db, "categories"));
        if (snap.empty) { listContainer.innerHTML = '<p style="color:var(--text-muted)">No hay categorías dinámicas adicionales creadas.</p>'; return; }
        
        listContainer.innerHTML = snap.docs.map(doc => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--background); border-radius:8px; border:1px solid var(--border);">
                <span style="color: var(--text);">📁 <strong>${sanitize(doc.data().name)}</strong></span>
                <button class="btn btn-danger btn-delete-cat" data-id="${doc.id}" style="width:auto; padding:4px 10px; background:#EF4444; color:white; border-radius:6px; font-size:13px; border:none; cursor:pointer;">Eliminar</button>
            </div>
        `).join('');

        listContainer.querySelectorAll('.btn-delete-cat').forEach(b => {
            b.onclick = async () => {
                if (confirm("¿Deseas eliminar esta categoría?")) {
                    await deleteDoc(doc(db, "categories", b.dataset.id));
                    loadCategoriesList();
                }
            };
        });
    };

    btn.onclick = async () => {
        const name = input.value.trim();
        if (!name) return alert("Por favor escribe un nombre para la categoría.");
        
        try {
            await addDoc(collection(db, "categories"), { name: name, createdAt: new Date() });
            input.value = "";
            alert("Categoría creada con éxito.");
            loadCategoriesList();
        } catch (e) { alert("Error al guardar categoría: " + e.message); }
    };

    await loadCategoriesList();
}

async function showAnnouncementManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:20px; font-size:1.4rem; font-weight:700;">Marquesina de Anuncios</h2>
        <div class="form-group" style="margin-bottom: 16px;">
            <label style="display:block; margin-bottom:6px; font-weight:600; font-size:14px;">Texto Informativo Destacado</label>
            <input type="text" id="announcement-input" class="form-input" style="width:100%; padding:10px; border-radius:6px; border:1px solid var(--border); background:var(--background); color:var(--text);" placeholder="Ej: ¡Descuento del 10% en accesorios pagando en efectivo!">
        </div>
        <button class="btn btn-primary" id="btn-save-announcement" style="padding: 12px 20px;">Actualizar y Publicar Anuncio</button>
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
            alert("Marquesina global de anuncios actualizada.");
        } catch (e) {
            alert("Error al actualizar la marquesina: " + e.message);
        }
    };
}

async function showAnalyticsManagement(target) {
    target.innerHTML = `
        <h2 style="margin-bottom:10px; font-size:1.4rem; font-weight:700;">Métricas de Popularidad</h2>
        <p style="color:var(--text-muted); font-size:14px; margin-bottom:24px;">Organiza los artículos del inventario según la cantidad de visitas recibidas en su ficha técnica.</p>
        
        <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; text-align:left; background:var(--background); border-radius:8px; border:1px solid var(--border); overflow:hidden;">
                <thead>
                    <tr style="background:rgba(168, 85, 247, 0.1); color:var(--text); font-weight:600;">
                        <th style="padding:12px 16px;">Producto</th>
                        <th style="padding:12px 16px;">Categoría</th>
                        <th style="padding:12px 16px;">Precio</th>
                        <th style="padding:12px 16px; text-align:center;">Visitas totales</th>
                    </tr>
                </thead>
                <tbody id="analytics-table-body">
                    <tr>
                        <td colspan="4" style="padding:24px; text-align:center; color:var(--text-muted);">Procesando datos del catálogo...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    const tableBody = document.getElementById('analytics-table-body');

    try {
        const snap = await getDocs(collection(db, "products"));
        if (snap.empty) {
            tableBody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:var(--text-muted);">No hay productos registrados para auditar.</td></tr>`;
            return;
        }

        const sortedProducts = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => (b.views || 0) - (a.views || 0));

        tableBody.innerHTML = sortedProducts.map(p => {
            const displayCat = Array.isArray(p.category) ? p.category.join(', ') : (p.category || 'General');
            return `
                <tr style="border-bottom:1px solid var(--border); transition:background 0.2s; color: var(--text);" onmouseover="this.style.background='rgba(168, 85, 247, 0.03)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:12px 16px; font-weight:500;">${sanitize(p.name)}</td>
                    <td style="padding:12px 16px; color:var(--text-muted); font-size:14px;">${sanitize(displayCat)}</td>
                    <td style="padding:12px 16px;">$${p.price.toLocaleString()} COP</td>
                    <td style="padding:12px 16px; text-align:center; font-weight:700; color:var(--primary); font-size:15px;">🔥 ${p.views || 0}</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" style="padding:24px; text-align:center; color:red;">Error cargando analíticas: ${error.message}</td></tr>`;
    }
}