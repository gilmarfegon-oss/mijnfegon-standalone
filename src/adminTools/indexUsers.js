// ✅ Eenmalig users indexeren

import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

export async function indexAllUsers() {
  const usersRef = collection(db, "users");
  const snap = await getDocs(usersRef);

  for (const userDoc of snap.docs) {
    const data = userDoc.data();

    const keywords = [];

    if (data.email) keywords.push(data.email.toLowerCase());
    if (data.installer_full_name)
      keywords.push(data.installer_full_name.toLowerCase());


    await updateDoc(doc(db, "users", userDoc.id), {
      keywords: keywords,
    });
  }

  alert("✅ Alle gebruikers opnieuw geïndexeerd!");
}
