export const store = {
    state: {
        user: null,
        role: 'user',
        cart: [],
        theme: localStorage.getItem('theme') || 'light',
        announcement: null
    },
    listeners: [],
    subscribe(listener) {
        this.listeners.push(listener);
        return () => { this.listeners = this.listeners.filter(l => l !== listener); };
    },
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.listeners.forEach(listener => listener(this.state));
    },
    addToCart(product) {
        const existing = this.state.cart.find(item => item.id === product.id);
        let updatedCart;
        if (existing) {
            updatedCart = this.state.cart.map(item => 
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
        } else {
            updatedCart = [...this.state.cart, { ...product, quantity: 1 }];
        }
        this.setState({ cart: updatedCart });
    },
    removeFromCart(productId) {
        this.setState({ cart: this.state.cart.filter(item => item.id !== productId) });
    },
    updateCartQuantity(productId, quantity) {
        if (quantity <= 0) return this.removeFromCart(productId);
        this.setState({
            cart: this.state.cart.map(item => item.id === productId ? { ...item, quantity } : item)
        });
    },
    
    // NUEVA FUNCIÓN: Generar texto del pedido listo para WhatsApp
    generateOrderMessage() {
        if (this.state.cart.length === 0) return "";
        
        let message = "¡Hola! Me gustaría realizar el siguiente pedido en *Tienda Malu*:\n\n";
        let total = 0;
        
        this.state.cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            message += `• *${item.name}* (x${item.quantity}) - $${subtotal.toLocaleString()}\n`;
        });
        
        message += `\n*Total a pagar:* $${total.toLocaleString()}`;
        return encodeURIComponent(message);
    }
};