/* ============================================================
   F1 INTERNATIONAL CHAMPIONSHIP — firebase-config.js
   ------------------------------------------------------------
   ACÁ VIVE LA CONEXIÓN A LA BASE DE DATOS COMPARTIDA.

   El sitio usa Firebase Firestore (de Google) como base de
   datos real: es gratis, no necesita servidor propio y funciona
   perfecto con GitHub Pages (que solo sirve archivos estáticos).
   Con esto, cuando el admin carga un resultado o agrega una
   noticia, TODOS los que entren al sitio (vos y tus amigos) ven
   los mismos datos actualizados — ya no depende del navegador
   de cada uno como pasaba con localStorage.

   CÓMO OBTENER TU PROPIA CONFIGURACIÓN (gratis, 5 minutos):
   1. Entrá a https://console.firebase.google.com/ y creá un
      proyecto nuevo (cualquier nombre, ej. "f1-championship").
   2. Adentro del proyecto: menú "Compilación" → "Firestore
      Database" → "Crear base de datos" → elegí "Modo de
      producción" (después ajustamos las reglas más abajo) →
      elegí la ubicación más cercana → Habilitar.
   3. En "Reglas" de Firestore, pegá esto y publicá (permite
      leer y escribir el documento del sitio; suficiente para
      un proyecto entre amigos, no para datos sensibles):

      rules_version = '2';
      service cloud.firestore {
        match /databases/{database}/documents {
          match /f1champ/{doc} {
            allow read: if true;
            allow write: if true;
          }
        }
      }

   4. Volvé al panel principal del proyecto (ícono de
      engranaje → "Configuración del proyecto") → abajo en
      "Tus apps" → ícono "</>" (Web) → registrá una app (el
      nombre que quieras, no hace falta Hosting).
   5. Firebase te va a mostrar un objeto "firebaseConfig" con
      tus propias claves. Copialo y reemplazá el de abajo por
      el tuyo.
   6. Subí este archivo tal cual a GitHub (las claves de
      Firebase Web NO son secretas, están pensadas para ir en
      el navegador — la seguridad real la dan las reglas del
      paso 3).
   ============================================================ */

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "TU_APP_ID",
};

firebase.initializeApp(firebaseConfig);
const firestoreDB = firebase.firestore();
