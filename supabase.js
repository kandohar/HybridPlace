import { createClient } from "https://esm.sh/@supabase/supabase-js";
import { updateLastUploadedSnapshotTime } from "./firebase.js";

const client = createClient('https://burgqxbhuggvjwkuezhj.supabase.co', 'sb_publishable_m0BzDFFVIqs6wV8dOBU4fw_k9bfshMu');

export async function uploadImage(image) {
    try {
        const now = new Date();
        const fileName = `snapshot_${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}_${now.getUTCHours().toString().padStart(2, "0")}-${now.getUTCMinutes().toString().padStart(2, "0")}-${now.getUTCSeconds().toString().padStart(2, "0")}.png`;

        const { data, error } = await client.storage.from('SeamlessPlace2025').upload(fileName, image, { "content-type": "image/png" });

        if (error) {
            showError(error);
        } else {
            console.debug("snapshot uploaded successfully");
            updateLastUploadedSnapshotTime();
        }
    } catch (exception) {
        showError(exception);
    }
}

function showError(error, extra = "") {
    console.error(`${error} - ${extra}`);

    documentErrorConsole.innerHTML += error + "<br>";
    documentErrorConsole.style.display = "block";
}