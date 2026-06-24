import { db } from '../core/firebase.js';
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { sanitize } from '../core/router.js';
import { store } from '../core/store.js';

let currentProductId = null;
let selectedRating = 5; // Calificación por defecto de las estrellas

export function initCommentsModule() {
    const modal = document.getElementById('comments-modal');
    const closeBtn = document.getElementById('close-comments-modal');
    const starSelector = document.getElementById('star-selector');
    const form = document.getElementById('form-add-comment');

    if (!modal) return;

    // 1. Evento para cerrar la modal
    closeBtn.onclick = () => {
        modal.classList.remove('open');
    };

    // Cerrar si hacen clic fuera de la caja blanca de la modal
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('open');
    };

    // 2. Lógica interactiva para seleccionar las estrellas flotantes
    const stars = starSelector.querySelectorAll('.star');
    stars.forEach(star => {
        // Inicializar por defecto las 5 estrellas activas
        star.classList.add('active');

        star.onclick = () => {
            selectedRating = parseInt(star.dataset.value);
            // Actualizar visualmente las estrellas doradas
            stars.forEach(s => {
                if (parseInt(s.dataset.value) <= selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        };
    });

    // 3. Envío del nuevo comentario a Firebase Firestore
    form.onsubmit = async (e) => {
        e.preventDefault();
        const commentTextInput = document.getElementById('comment-text');
        const text = commentTextInput.value.trim();

        if (!currentProductId) return;

        // Validamos si hay un usuario logueado en tu estado global o lo dejamos como Anónimo
        const userName = store.state.user?.email ? store.state.user.email.split('@')[0] : "Cliente Anónimo";

        try {
            await addDoc(collection(db, "comments"), {
                productId: currentProductId,
                user: userName,
                rating: selectedRating,
                text: text || "Calificó este producto sin dejar una reseña escrita.",
                createdAt: new Date()
            });

            commentTextInput.value = "";
            alert("¡Muchas gracias por tu calificación!");
            // Refrescar el listado inmediatamente
            loadCommentsForProduct(currentProductId);
        } catch (error) {
            alert("Error al procesar tu comentario: " + error.message);
        }
    };
}

// 4. Cargar y renderizar las opiniones de un producto seleccionado
export async function openCommentsModal(productId, productName) {
    currentProductId = productId;
    const modal = document.getElementById('comments-modal');
    const modalTitle = document.getElementById('modal-product-title');
    const listContainer = document.getElementById('comments-list');

    if (!modal || !listContainer) return;

    modalTitle.textContent = `Reseñas de: ${sanitize(productName)}`;
    listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:14px; padding:12px;">Cargando opiniones de clientes...</p>`;
    
    // Abrir ventana flotante con la animación del CSS
    modal.classList.add('open');

    try {
        // Consulta filtrada en Firebase ordenando por los más recientes
        const q = query(
            collection(db, "comments"),
            where("productId", "==", productId),
            orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:14px; padding:20px;">Este producto aún no tiene comentarios. ¡Sé el primero en calificarlo!</p>`;
            return;
        }

        listContainer.innerHTML = snap.docs.map(doc => {
            const data = doc.data();
            const starsGold = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
            return `
                <div class="comment-item" style="animation: fadeIn 0.25s ease;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                        <strong style="color:var(--primary); font-weight:600;">@${sanitize(data.user)}</strong>
                        <span style="color:#FBBF24; font-weight:bold;">${starsGold}</span>
                    </div>
                    <p style="font-size:14px; margin:0; line-height:1.4; color:var(--text);">${sanitize(data.text)}</p>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error cargando comentarios: ", error);
        // Si sale un error de índice en la consola de Firebase por usar 'orderBy', usamos un fallback simple sin ordenar
        try {
            const fallbackSnap = await getDocs(query(collection(db, "comments"), where("productId", "==", productId)));
            if (fallbackSnap.empty) {
                listContainer.innerHTML = `<p style="text-align:center; color:var(--text-muted); font-size:14px; padding:20px;">Sin comentarios todavía.</p>`;
                return;
            }
            listContainer.innerHTML = fallbackSnap.docs.map(doc => {
                const data = doc.data();
                const starsGold = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
                return `
                    <div class="comment-item">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                            <strong style="color:var(--primary);">@${sanitize(data.user)}</strong>
                            <span style="color:#FBBF24;">${starsGold}</span>
                        </div>
                        <p style="font-size:14px; margin:0;">${sanitize(data.text)}</p>
                    </div>
                `;
            }).join('');
        } catch (e) {
            listContainer.innerHTML = `<p style="color:red; font-size:13px;">No se pudieron cargar las reseñas.</p>`;
        }
    }
}

// Función auxiliar interna para refrescar
async function loadCommentsForProduct(productId) {
    const listContainer = document.getElementById('comments-list');
    if (!listContainer) return;
    try {
        const fallbackSnap = await getDocs(query(collection(db, "comments"), where("productId", "==", productId)));
        if (fallbackSnap.empty) return;
        listContainer.innerHTML = fallbackSnap.docs.map(doc => {
            const data = doc.data();
            const starsGold = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
            return `
                <div class="comment-item">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px;">
                        <strong style="color:var(--primary);">@${sanitize(data.user)}</strong>
                        <span style="color:#FBBF24;">${starsGold}</span>
                    </div>
                    <p style="font-size:14px; margin:0;">${sanitize(data.text)}</p>
                </div>
            `;
        }).join('');
    } catch (e) { console.log(e); }
}