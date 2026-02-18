import Link from "next/link";

export default function NotAuthorized() {
    return (
        <div style={{ padding: 16 }}>
            <h2>Not authorized</h2>
            <p>You can login, but you are not a manager.</p>
            <p>
                Ask admin to create a Firestore doc: <code>managers/{`{your uid}`}</code> with <code>{"{ active: true }"}</code>
            </p>
            <Link href="/login">Back to login</Link>
        </div>
    );
}
