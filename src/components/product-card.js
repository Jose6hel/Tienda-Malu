import { sanitize } from '../core/router.js';

export function createProductCard(product) {
    const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23E2E8F0"/></svg>';
    return `
        <div class="card" data-id="${product.id}">
            <div class="card-img-wrapper">
                <img class="card-img" src="${product.imageUrl || placeholder}" loading="lazy" alt="${sanitize(product.name)}">
            </div>
            <div class="card-body">
                <span style="font-size:0.75rem; text-transform:uppercase; font-weight:600; color:var(--primary);">${sanitize(product.category || 'General')}</span>
                <h3 style="font-size:1.1rem; font-weight:600; margin:4px 0;">${sanitize(product.name)}</h3>
                <div style="color:%23F59E0B; font-size:0.875rem;">★ ${product.rating || '5.0'}</div>
                <p class="product-price">$${product.price.toLocaleString()}</p>
                <button class="btn btn-primary btn-add-cart" data-id="${product.id}" style="margin-top:auto;">Agregar al Carrito</button>
            </div>
        </div>
    `;
}