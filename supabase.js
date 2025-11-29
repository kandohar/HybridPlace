
const client = supabase.createClient('https://burgqxbhuggvjwkuezhj.supabase.co3', 'sb_publishable_m0BzDFFVIqs6wV8dOBU4fw_k9bfshMu');

export async function uploadImage(image) {
    try {
        const { data, error } = await client.storage.from('SeamlessPlace2025').upload('test.png', image);

        if (error) {
            console.log(error);
        } else {
            console.log(data);
        }
    } catch (error) {
        console.log(error);
    }
}