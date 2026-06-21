import { auth, db } from './firebase.js';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { store } from './store.js';

const ADMIN_EMAIL = "jos3davidortizverano2009@gmail.com";

export async function sendMagicLink(email) {
    const actionCodeSettings = {
  url: window.location.origin + "/?mode=login",
        handleCodeInApp: true,
    };
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
}

export async function handleSignInWithLink() {
    console.log("Entró a handleSignInWithLink");

    if (isSignInWithEmailLink(auth, window.location.href)) {
        console.log("Firebase detectó un Magic Link válido");

        let email = window.localStorage.getItem('emailForSignIn');

        if (!email) {
            email = window.prompt('Por favor, introduce tu correo para confirmación:');
        }

        const result = await signInWithEmailLink(
            auth,
            email,
            window.location.href
        );

        console.log("Usuario autenticado:", result.user);

        window.localStorage.removeItem('emailForSignIn');

        await syncUserRole(result.user);

        console.log("Rol sincronizado correctamente");
    }
}

async function syncUserRole(user) {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    let role = "user";
    if (user.email === ADMIN_EMAIL) {
        role = "admin";
    } else if (userDoc.exists()) {
        role = userDoc.data().role || "user";
    }

    await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        role: role,
        lastLogin: new Date()
    }, { merge: true });

    store.setState({ user, role });
}

// Escuchador persistente en el ciclo de vida de la aplicación
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await syncUserRole(user);
    } else {
        store.setState({ user: null, role: 'user' });
    }
});

export async function logout() {
    await signOut(auth);
    store.setState({ user: null, role: 'user', cart: [] });
    window.location.href = '/';
}