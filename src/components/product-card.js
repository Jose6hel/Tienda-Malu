import { sanitize } from '../core/router.js';

export function createProductCard(product) {
    const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23E2E8F0"/></svg>';
    
    // 1. Lógica para renderizar la etiqueta y calcular el porcentaje de descuento real
    let tagHtml = '';
    let priceHtml = `<p class="product-price">$${product.price.toLocaleString()}</p>`;
    
    if (product.tag) {
        if (product.tag === 'Descuento' && product.originalPrice && product.originalPrice > product.price) {
            // Calcular porcentaje exacto de descuento
            const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
            tagHtml = `<span class="product-tag tag-descuento" style="background:#EF4444; color:white; font-weight:700;">-${discountPercent}%</span>`;
            
            // Renderizar precio con formato "Antes" y "Después"
            priceHtml = `
                <div style="margin-top: auto; display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-decoration: line-through;">$${product.originalPrice.toLocaleString()}</span>
                    <span class="product-price" style="color: #EF4444; margin: 0; font-weight: 700;">$${product.price.toLocaleString()}</span>
                </div>
            `;
        } else {
            const tagClass = `tag-${product.tag.toLowerCase()}`; // tag-nuevo, tag-destacado
            tagHtml = `<span class="product-tag ${tagClass}">${sanitize(product.tag)}</span>`;
        }
    }

    // 2. Estrellas dinámicas basadas en la puntuación promedio del producto
    const avgRating = product.rating ? Number(product.rating).toFixed(1) : '5.0';
    const stars = '⭐'.repeat(Math.round(product.rating || 5)) || '✨';

    // 3. Manejo de múltiples imágenes (usa la primera del arreglo si existe)
    const displayImage = product.images && product.images.length > 0 ? product.images[0] : (product.imageUrl || placeholder);

    // Renderizado de la tarjeta interactiva limpia, apuntando directamente a la URL de detalles
    return `
        <div class="card" data-id="${product.id}" style="cursor: pointer; display: flex; flex-direction: column; position: relative;" onclick="if(!event.target.classList.contains('btn-add-cart')) window.location.href='/product?id=${product.id}'">
            <!-- Etiqueta flotante con lógica de descuento dinámico -->
            ${tagHtml}
            
            <div class="card-img-wrapper" style="overflow: hidden;">
                <img class="card-img" src="${displayImage}" loading="lazy" alt="${sanitize(product.name)}" style="transition: transform 0.3s ease;">
            </div>
            
            <div class="card-body" style="display: flex; flex-direction: column; flex-grow: 1;">
                <span style="font-size:0.75rem; text-transform:uppercase; font-weight:600; color:var(--primary);">${sanitize(Array.isArray(product.category) ? product.category.join(', ') : (product.category || 'General'))}</span>
                <h3 style="font-size:1rem; font-weight:600; margin:4px 0; line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; height:2.4em; color: var(--text);">${sanitize(product.name)}</h3>
                
                <!-- Sistema de Calificación limpio sin el enlace flotante de leer comentarios -->
                <div class="rating-container" style="display: flex; align-items: center; gap: 4px; font-size: 0.85rem; margin-bottom: 8px;">
                    <span style="color: #FBBF24;">${stars}</span>
                    <span style="color: var(--text-muted); font-weight: 500;">(${avgRating})</span>
                </div>
                
                <!-- Estructura de Precios Actualizada -->
                ${priceHtml}
                
                <button class="btn btn-primary btn-add-cart" data-id="${product.id}" style="margin-top:12px; width: 100%;">Agregar al Carrito</button>
            </div>
        </div>
    `;
}