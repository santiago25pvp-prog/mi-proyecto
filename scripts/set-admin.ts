import 'dotenv/config';
import { supabase } from '../services/vector-db';

async function setAdminRole() {
    const userId = 'eb4fdb29-8c67-4861-95c0-a2eca590bafd';

    const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        { 
            app_metadata: { role: 'admin' }
        }
    );

    if (error) {
        console.error('Error al actualizar rol del usuario:', error.message);
    } else {
        console.log('Usuario actualizado exitosamente:', data.user.id, data.user.app_metadata);
    }
}

setAdminRole().catch(console.error);
