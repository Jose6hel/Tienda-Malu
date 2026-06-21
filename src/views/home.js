import { db } from '../core/firebase.js';
import { collection, getDocs } from "firebase/firestore";
import { createProductCard } from '../components/product-card.js';
import { store } from '../core/store.js';

export async function renderHome(container) {
    container.innerHTML = `
        <section style="margin-bottom: 32px; text-align: center; padding: 40px 16px; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border);">
            <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 8px;">Tecnología Avanzada a Tu Alcance</h1>
            <p style="color: var(--text-muted);">Explora productos premium garantizados con soporte técnico especializado.</p>
        </section>

        <section style="margin-bottom:24px; display:flex; gap:16px; flex-wrap:wrap;">
            <input type="text" id="search-input" class="form-input" style="flex-grow:1; max-width:400px;" placeholder="¿Qué estás buscando?">
            <select id="category-filter" class="form-input" style="max-width:200px;">
                <option value="all">Todas las Categorías</option>
                <option value="Celulares">Celulares</option>
                <option value="Accesorios">Accesorios</option>
                <option value="Tecnología">Tecnología</option>
            </select>
        </section>

        <div id="products-loading" class="grid">
            ${'<div class="skeleton" style="height:350px;"></div>'.repeat(4)}
        </div>
        <div id="products-grid" class="grid hidden"></div>
    `;

    const loadingGrid = document.getElementById('products-loading');
    const productsGrid = document.getElementById('products-grid');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        loadingGrid.classList.add('hidden');
        productsGrid.classList.remove('hidden');

        const displayProducts = (list) => {
            if (list.length === 0) {
                productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-muted);">No se encontraron productos.</p>`;
                return;
            }
            productsGrid.innerHTML = list.map(p => createProductCard(p)).join('');
            
            // Asignación de clics a los botones de compra del listado dinámico
            productsGrid.querySelectorAll('.btn-add-cart').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const prod = list.find(item => item.id === btn.dataset.id);
                    if (prod) store.addToCart(prod);
                };
            });
        };

        displayProducts(products);

        // Lógica del motor de búsqueda reactivo en tiempo real
        const filterProducts = () => {
            const queryText = searchInput.value.toLowerCase();
            const selectedCat = categoryFilter.value;

            const filtered = products.filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(queryText) || p.description?.toLowerCase().includes(queryText);
                const matchesCategory = selectedCat === 'all' || p.category === selectedCat;
                return matchesSearch && matchesCategory;
            });
            displayProducts(filtered);
        };

        searchInput.oninput = filterProducts;
        categoryFilter.onchange = filterProducts;

    } catch (error) {
        loadingGrid.innerHTML = `<p style="color:red;">Error al cargar el catálogo de productos: ${error.message}</p>`;
    }
}