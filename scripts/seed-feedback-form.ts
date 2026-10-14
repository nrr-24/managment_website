/**
 * Put the standard 8 customer-feedback questions into Firestore.
 *
 * Usage:
 *   npx tsx scripts/seed-feedback-form.ts --dry-run   # show what exists / what would change
 *   npx tsx scripts/seed-feedback-form.ts             # write
 *
 * Behaviour (never creates duplicates):
 *   - a form already containing these questions  -> left untouched
 *   - a form that is still a single blank question -> filled with the questions
 *   - otherwise                                    -> a new "Customer Feedback" form is created
 * The form is left hidden (isActive: false); switch on "Show in the app" on the website.
 */

import { resolve } from "path";
import { randomUUID } from "crypto";
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

config({ path: resolve(__dirname, "../.env.local") });

if (getApps().length === 0) {
    initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
    });
}
const db = getFirestore();
const dryRun = process.argv.includes("--dry-run");

type Q = { id: string; text: string; type: "text" | "stars" | "yesno" | "smiley"; required: boolean };
const q = (text: string, type: Q["type"], required = false): Q => ({ id: randomUUID().toUpperCase(), text, type, required });

// Keep in sync with defaultFormQuestions() in lib/data.ts
const questions = (): Q[] => [
    q("Is this your first time at our restaurant?", "yesno"),
    q("What is your overall satisfaction with our restaurant?", "stars", true),
    q("How would you rate the hygiene?", "stars"),
    q("How would you rate the taste of our food?", "stars"),
    q("Would you come back to eat with us again?", "yesno"),
    q("Is there anything else you want to tell us?", "text"),
    q("Name", "text", true),
    q("Email address", "text", true),
];

async function main() {
    const snap = await db.collection("feedbackForms").get();
    console.log(`Existing feedbackForms: ${snap.size}`);
    snap.docs.forEach((d) => {
        const data = d.data();
        console.log(`  - ${d.id}  "${data.title}"  questions=${(data.questions ?? []).length}  live=${data.isActive === true}`);
    });

    const wanted = questions();
    const alreadyThere = snap.docs.find((d) => {
        const texts = ((d.data().questions ?? []) as Q[]).map((x) => x.text);
        return wanted.every((w) => texts.includes(w.text));
    });
    if (alreadyThere) {
        console.log(`\nForm ${alreadyThere.id} already has these questions — nothing to do.`);
        return;
    }

    const blank = snap.docs.find((d) => {
        const qs = (d.data().questions ?? []) as Q[];
        return qs.length === 0 || (qs.length === 1 && !qs[0].text?.trim());
    });

    if (blank) {
        console.log(`\nWill fill the blank form ${blank.id} ("${blank.data().title}") with ${wanted.length} questions.`);
        if (dryRun) return;
        await blank.ref.update({ questions: wanted, updatedAt: FieldValue.serverTimestamp() });
        console.log("Done: updated existing form.");
    } else {
        console.log(`\nWill create a new "Customer Feedback" form with ${wanted.length} questions (hidden).`);
        if (dryRun) return;
        const ref = await db.collection("feedbackForms").add({
            title: "Customer Feedback",
            isActive: false,
            questions: wanted,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`Done: created form ${ref.id}.`);
    }
}

main().then(() => process.exit(0)).catch((e) => {
    console.error(e);
    process.exit(1);
});
