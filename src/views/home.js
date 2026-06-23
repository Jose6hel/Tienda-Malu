import { db } from '../core/firebase.js';
import { collection, getDocs } from "firebase/firestore";
import { createProductCard } from '../components/product-card.js';
import { store } from '../core/store.js';

export async function renderHome(container) {
    container.innerHTML = `
        <div id="popup-ad-overlay" class="hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.6); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.3s ease;">
            <div style="position:relative; width:90%; max-width:450px; background:var(--surface); border-radius:var(--radius); overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25); border:1px solid var(--border); transform:scale(0.9); transition:transform 0.3s ease;" id="popup-ad-card">
                <button id="btn-close-popup" style="position:absolute; top:12px; right:12px; width:32px; height:32px; border-radius:50%; border:none; background:rgba(0,0,0,0.5); color:white; font-size:14px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10; backdrop-filter:blur(2px);">✕</button>
                <div id="popup-ad-body">
                </div>
            </div>
        </div>

        <section style="margin-bottom:28px; display:flex; gap:12px; flex-wrap:wrap; margin-top:8px;">
            <input type="text" id="search-input" class="form-input" style="flex-grow:1; max-width:400px;" placeholder="¿Qué estás buscando hoy?">
            <select id="category-filter" class="form-input" style="max-width:220px; cursor: pointer;">
                <option value="all">Todas las Categorías</option>
                <option value="Tecnología">Tecnología</option>
                <option value="Calzado">Calzado</option>
                <option value="Sandalias">Sandalias</option>
                <option value="Ropa">Ropa</option>
                <option value="Accesorios">Accesorios</option>
                <option value="Comida">Comida y Snacks</option>
            </select>
        </section>

        <div id="products-loading" class="grid">
            ${'<div class="skeleton" style="height:290px;"></div>'.repeat(4)}
        </div>
        <div id="products-grid" class="grid hidden"></div>
    `;

    const loadingGrid = document.getElementById('products-loading');
    const productsGrid = document.getElementById('products-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');
    const popupOverlay = document.getElementById('popup-ad-overlay');
    const popupCard = document.getElementById('popup-ad-card');
    const popupBody = document.getElementById('popup-ad-body');
    const closePopupBtn = document.getElementById('btn-close-popup');

    // Manejo del Popup publicitario administrable desde la sección Marquesina Global
    const checkPopupAd = async () => {
        try {
            // Consultamos la colección unificada con la sección de administración
            const snap = await getDocs(collection(db, "announcements"));
            if (!snap.empty) {
                const adData = snap.docs[0].data();
                
                // Solo se despliega el pop-up si el administrador subió una imagen válida
                if (adData.popupImageUrl) {
                    popupBody.innerHTML = `<img src="${adData.popupImageUrl}" alt="Anuncio Especial" style="width:100%; height:auto; display:block; object-fit:contain; max-height:75vh;">`;
                    
                    // Mostrar con micro-animación fluida
                    popupOverlay.classList.remove('hidden');
                    setTimeout(() => {
                        popupOverlay.style.opacity = "1";
                        popupCard.style.transform = "scale(1)";
                    }, 50);

                    const closePopup = () => {
                        popupOverlay.style.opacity = "0";
                        popupCard.style.transform = "scale(0.9)";
                        setTimeout(() => popupOverlay.classList.add('hidden'), 300);
                    };

                    closePopupBtn.onclick = closePopup;
                    popupOverlay.onclick = (e) => { if (e.target === popupOverlay) closePopup(); };
                }
            }
        } catch (err) { 
            console.log("Módulo de publicidad pasivo o sin anuncios configurados."); 
        }
    };

    try {
        // Carga dinámica de categorías personalizadas creadas en el panel
        try {
            const catSnapshot = await getDocs(collection(db, "categories"));
            const excluded = ["tecnología", "calzado", "sandalias", "ropa", "accesorios", "comida"];
            catSnapshot.forEach(doc => {
                const catData = doc.data();
                if (catData.name && !excluded.includes(catData.name.toLowerCase())) {
                    const option = document.createElement('option');
                    option.value = catData.name;
                    option.textContent = catData.name;
                    categoryFilter.appendChild(option);
                }
            });
        } catch (e) { console.log("Categorías adicionales listas."); }

        // Recuperar catálogo completo de Firebase
        const querySnapshot = await getDocs(collection(db, "products"));
        const rawProducts = [];
        querySnapshot.forEach(doc => {
            rawProducts.push({ id: doc.id, ...doc.data() });
        });

        // ALGORITMO JERÁRQUICO: Ordenar productos por prioridades de forma estricta
        const sortProductsByPriority = (list) => {
            return [...list].sort((a, b) => {
                // 1. Destacados primero
                const isDestacadoA = a.tag === 'Destacado' ? 1 : 0;
                const isDestacadoB = b.tag === 'Destacado' ? 1 : 0;
                if (isDestacadoA !== isDestacadoB) return isDestacadoB - isDestacadoA;

                // 2. Más vistos (Popularidad real de views)
                const viewsA = Number(a.views) || 0;
                const viewsB = Number(b.views) || 0;
                if (viewsA !== viewsB) return viewsB - viewsA;

                // 3. Nuevos
                const isNuevoA = a.tag === 'Nuevo' ? 1 : 0;
                const isNuevoB = b.tag === 'Nuevo' ? 1 : 0;
                if (isNuevoA !== isNuevoB) return isNuevoB - isNuevoA;

                // 4. En Descuento
                const isDescA = a.tag === 'Descuento' ? 1 : 0;
                const isDescB = b.tag === 'Descuento' ? 1 : 0;
                if (isDescA !== isDescB) return isDescB - isDescA;

                // 5. Sin etiqueta al final
                return 0;
            });
        };

        const organizedProducts = sortProductsByPriority(rawProducts);

        loadingGrid.classList.add('hidden');
        productsGrid.classList.remove('hidden');

        const displayProducts = (list) => {
            if (list.length === 0) {
                productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted); font-size:14px;">No encontramos coincidencias para esta búsqueda.</p>`;
                return;
            }
            productsGrid.innerHTML = list.map(p => createProductCard(p)).join('');
            
            // --- AJUSTE: Interceptar clicks generales en las tarjetas creadas para usar SPA nativo ---
            productsGrid.querySelectorAll('.card, [data-link]').forEach(card => {
                card.onclick = (e) => {
                    if (e.target.closest('.btn-add-cart')) return;

                    e.preventDefault();
                    
                    const anchor = card.tagName === 'A' ? card : card.querySelector('a');
                    const urlStr = anchor ? anchor.getAttribute('href') : '';
                    
                    if (urlStr) {
                        window.history.pushState({}, "", urlStr);
                        window.dispatchEvent(new Event('popstate'));
                    }
                };
            });

            // Re-asignación de escuchas atómicos de botones para el carrito
            productsGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const prod = list.find(item => item.id === btn.dataset.id);
                    if (prod) {
                        if ((prod.colors && prod.colors.length > 0) || (prod.sizes && prod.sizes.length > 0)) {
                            window.history.pushState({}, "", `/product?id=${prod.id}`);
                            window.dispatchEvent(new Event('popstate'));
                        } else {
                            store.addToCart(prod);
                            alert(`¡Añadido! ${prod.name} al carrito.`);
                        }
                    }
                };
            });
        };

        // Renderizado inicial con prioridades estructuradas
        displayProducts(organizedProducts);

        // Buscador reactivo compatible con Arrays de categorías múltiples
        const filterProducts = () => {
            const queryText = searchInput.value.toLowerCase().trim();
            const selectedCat = categoryFilter.value;

            const filtered = organizedProducts.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(queryText) || p.description?.toLowerCase().includes(queryText);
                
                const productCategories = Array.isArray(p.category) 
                    ? p.category.map(c => c.toLowerCase()) 
                    : [String(p.category || 'General').toLowerCase()];
                
                const matchesCategory = selectedCat === 'all' || productCategories.includes(selectedCat.toLowerCase());
                
                return matchesSearch && matchesCategory;
            });
            displayProducts(filtered);
        };

        searchInput.oninput = filterProducts;
        categoryFilter.onchange = filterProducts;

        // Ejecutar revisión del Popup publicitario al renderizar la landing page
        await checkPopupAd();

    } catch (error) {
        loadingGrid.innerHTML = `<p style="color:red; padding:20px; font-size:14px;">Error de sincronización con la vitrina: ${error.message}</p>`;
    }
}