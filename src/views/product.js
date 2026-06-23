import { db } from '../core/firebase.js';
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { sanitize } from '../core/router.js';
import { store } from '../core/store.js';
import { openCommentsModal } from '../components/comments.js';

export async function renderProductDetail(container) {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <p style="color:var(--text-muted);">No se especificó ningún producto. <a href="/" data-link style="color:var(--primary); font-weight:600;">Volver al inicio</a></p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div id="detail-loading" style="padding: 60px; text-align: center;">
            <p style="color:var(--text-muted);">Cargando especificaciones del producto...</p>
        </div>
        <div id="detail-content" class="hidden" style="padding: 16px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; animation: fadeIn 0.3s ease;">
        </div>
    `;

    const loadingEl = document.getElementById('detail-loading');
    const contentEl = document.getElementById('detail-content');

    try {
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            loadingEl.innerHTML = `<p style="color:var(--text-muted);">El producto solicitado no existe en nuestro inventario.</p>`;
            return;
        }

        const product = { id: productSnap.id, ...productSnap.data() };

        // 1. REGISTRO DE ANALÍTICAS ACTUALIZADO (Asegura persistencia de la propiedad views)
        await updateDoc(productRef, {
            views: increment(1)
        }).catch(err => console.error("Error al registrar analítica:", err));

        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');

        // Lógica de Imágenes Múltiples (Galería)
        const allImages = product.images && product.images.length > 0 ? product.images : [product.imageUrl || '/src/assets/placeholder.svg'];
        
        // Lógica de Descuentos Reales
        let discountBadge = '';
        let priceHTML = `<div style="font-size: 1.8rem; font-weight: 700; color: var(--text);">$${product.price.toLocaleString()} COP</div>`;
        
        if (product.tag === 'Descuento' && product.originalPrice && product.originalPrice > product.price) {
            const percent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
            discountBadge = `<span style="position: absolute; top: 12px; left: 12px; background: #EF4444; color: white; padding: 4px 10px; border-radius: var(--radius); font-size: 12px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.15); animation: pulse 2s infinite;">-${percent}% DESC</span>`;
            
            priceHTML = `
                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span style="font-size: 1.8rem; font-weight: 700; color: #EF4444;">$${product.price.toLocaleString()} COP</span>
                    <span style="font-size: 1.2rem; color: var(--text-muted); text-decoration: line-through;">$${product.originalPrice.toLocaleString()} COP</span>
                </div>
            `;
        } else if (product.tag) {
            discountBadge = `<span style="position: absolute; top: 12px; left: 12px; background: var(--primary); color: white; padding: 4px 10px; border-radius: var(--radius); font-size: 12px; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${product.tag}</span>`;
        }

        // Estrellas Promedio Dinámicas
        const avgRating = product.rating || 0;
        const totalRatings = product.ratingCount || 0;
        const starsHTML = '⭐'.repeat(Math.round(avgRating)) || '✨';

        // Renderizado del esqueleto de la vista de detalles
        contentEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: flex; align-items: center; justify-content: center; overflow: hidden; min-height: 350px;">
                    ${discountBadge}
                    <img id="main-product-image" src="${allImages[0]}" alt="${sanitize(product.name)}" style="max-width: 100%; max-height: 360px; object-fit: contain; border-radius: 8px; transition: transform 0.3s ease;">
                </div>
                <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px;">
                    ${allImages.map((img, idx) => `
                        <img class="thumb-img" src="${img}" data-index="${idx}" style="width: 65px; height: 65px; object-fit: cover; border-radius: 6px; border: 2px solid ${idx === 0 ? 'var(--primary)' : 'var(--border)'}; cursor: pointer; background: var(--surface);">
                    `).join('')}
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; justify-content: center; gap: 16px;">
                <div>
                    <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--primary);">${sanitize(Array.isArray(product.category) ? product.category.join(', ') : (product.category || 'General'))}</span>
                    <h1 style="font-size: 1.8rem; font-weight: 700; margin-top: 4px; color: var(--text);">${sanitize(product.name)}</h1>
                    <div style="font-size: 14px; margin-top: 4px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                        <span>${starsHTML}</span> 
                        <span>(${avgRating.toFixed(1)} de 5.0 basada en ${totalRatings} valoraciones)</span>
                    </div>
                </div>

                ${priceHTML}

                <p style="color: var(--text-muted); line-height: 1.5; font-size: 0.95rem;">
                    ${sanitize(product.description || 'Este excelente artículo está disponible en nuestro catálogo con entrega inmediata y total garantía de autenticidad.')}
                </p>

                <div id="product-variants" style="display: flex; flex-direction: column; gap: 12px; margin: 8px 0;">
                    ${product.colors && product.colors.length > 0 ? `
                        <div>
                            <label style="font-size: 14px; font-weight: 600; color: var(--text); display: block; margin-bottom: 6px;">Selecciona un Color:</label>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${product.colors.map((c, i) => `
                                    <button class="variant-btn color-btn ${i === 0 ? 'active-variant' : ''}" data-value="${sanitize(c)}" style="padding: 8px 14px; border-radius: 6px; border: 1px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}; background: ${i === 0 ? 'rgba(168,85,247,0.1)' : 'var(--surface)'}; color: var(--text); cursor: pointer; font-size: 13px; font-weight: 500;">
                                        ${sanitize(c)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${product.sizes && product.sizes.length > 0 ? `
                        <div style="margin-top: 4px;">
                            <label style="font-size: 14px; font-weight: 600; color: var(--text); display: block; margin-bottom: 6px;">Selecciona tu Talla / Tamaño:</label>
                            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                ${product.sizes.map((s, i) => `
                                    <button class="variant-btn size-btn ${i === 0 ? 'active-variant' : ''}" data-value="${sanitize(s)}" style="padding: 8px 14px; border-radius: 6px; border: 1px solid ${i === 0 ? 'var(--primary)' : 'var(--border)'}; background: ${i === 0 ? 'rgba(168,85,247,0.1)' : 'var(--surface)'}; color: var(--text); cursor: pointer; font-size: 13px; font-weight: 500;">
                                        ${sanitize(s)}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
                    <button id="btn-add-detail" class="btn btn-primary" style="padding: 14px; font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        🛒 Añadir al Carrito de Compras
                    </button>
                    
                    <button id="btn-comments-detail" class="btn" style="background: transparent; color: var(--primary); border: 1px solid var(--primary); padding: 10px; font-size: 0.95rem;">
                        ⭐ Consultar Opiniones y Calificaciones
                    </button>
                </div>
                
                <a href="/" data-link style="margin-top: 8px; display: inline-block; font-size: 14px; color: var(--text-muted); text-decoration: none; width: fit-content;">← Volver a la vitrina principal</a>
            </div>
        `;

        // Controladores del Carrusel de Fotos
        const mainImg = document.getElementById('main-product-image');
        contentEl.querySelectorAll('.thumb-img').forEach(thumb => {
            thumb.onclick = () => {
                mainImg.src = thumb.src;
                contentEl.querySelectorAll('.thumb-img').forEach(t => t.style.borderColor = 'var(--border)');
                thumb.style.borderColor = 'var(--primary)';
            };
        });

        // Controladores de selección de variantes interactivas
        const setupVariantSelection = (className) => {
            const elements = contentEl.querySelectorAll('.' + className);
            elements.forEach(btn => {
                btn.onclick = () => {
                    elements.forEach(b => {
                        b.style.border = '1px solid var(--border)';
                        b.style.background = 'var(--surface)';
                        b.classList.remove('active-variant');
                    });
                    btn.style.border = '1px solid var(--primary)';
                    btn.style.background = 'rgba(168, 85, 247, 0.1)';
                    btn.classList.add('active-variant');
                };
            });
        };
        setupVariantSelection('color-btn');
        setupVariantSelection('size-btn');

        // Evento para añadir al carrito incluyendo variantes seleccionadas de forma estricta
        document.getElementById('btn-add-detail').onclick = () => {
            const selectedColorEl = contentEl.querySelector('.color-btn.active-variant');
            const selectedSizeEl = contentEl.querySelector('.size-btn.active-variant');
            
            // Creamos una copia del producto adaptada con lo seleccionado para el objeto del carrito
            const customizedProduct = {
                ...product,
                selectedColor: selectedColorEl ? selectedColorEl.dataset.value : null,
                selectedSize: selectedSizeEl ? selectedSizeEl.dataset.value : null
            };
            
            store.addToCart(customizedProduct);
            alert(`¡Añadido al carrito! ${product.name} ${customizedProduct.selectedColor ? `(${customizedProduct.selectedColor})` : ''}`);
        };

        // Evento para abrir el sistema de comentarios
        document.getElementById('btn-comments-detail').onclick = () => {
            openCommentsModal(product.id, product.name);
        };

    } catch (error) {
        loadingEl.innerHTML = `<p style="color:red;">Error crítico al procesar la ficha técnica: ${error.message}</p>`;
    }
}