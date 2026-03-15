import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function getAccessToken() {
    const email = 'juantilo123@gmail.com'; // Cambia esto por tu usuario de prueba
    const password = 'juantilo123'; // Cambia esto por tu contraseña de prueba

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error al obtener el token:', error.message);
        return;
    }

    console.log('Access Token:', data.session.access_token);
}

getAccessToken();
