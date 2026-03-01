export const metadata = {
    title: "Privacy Policy – GreenHills Menu App",
};

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-2xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                <p className="text-sm text-gray-400 mb-10">Last updated: February 26, 2026</p>

                <div className="space-y-8 text-[15px] text-gray-600 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Introduction</h2>
                        <p>
                            GreenHills Menu App (&quot;we&quot;, &quot;our&quot;, or &quot;the app&quot;) is a restaurant menu management application.
                            This Privacy Policy explains how we collect, use, and protect your information when you use our iOS app and web platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Information We Collect</h2>
                        <p className="mb-3">We collect the following information to provide and improve our services:</p>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li><strong>Account information:</strong> Name and email address, used for authentication and account management.</li>
                            <li><strong>Restaurant data:</strong> Menu content including restaurant names, categories, dish names, descriptions, prices, and images that you upload through the app.</li>
                            <li><strong>Usage data:</strong> Basic usage information to maintain and improve app functionality.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">How We Use Your Information</h2>
                        <ul className="list-disc pl-5 space-y-1.5">
                            <li>To authenticate your identity and manage your account.</li>
                            <li>To store and display restaurant menu data that you create.</li>
                            <li>To provide customer-facing digital menus for your restaurants.</li>
                            <li>To maintain, protect, and improve the app.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Storage</h2>
                        <p>
                            Your data is stored securely using Google Firebase (Firestore and Firebase Storage).
                            All data is transmitted over encrypted connections (HTTPS/TLS).
                            We do not sell, rent, or share your personal data with third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Third-Party Services</h2>
                        <p>We use the following third-party services:</p>
                        <ul className="list-disc pl-5 space-y-1.5 mt-2">
                            <li><strong>Firebase Authentication:</strong> For secure user sign-in.</li>
                            <li><strong>Firebase Firestore:</strong> For storing restaurant and menu data.</li>
                            <li><strong>Firebase Storage:</strong> For storing uploaded images.</li>
                        </ul>
                        <p className="mt-2">
                            These services are governed by <a href="https://policies.google.com/privacy" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">Google&apos;s Privacy Policy</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Retention</h2>
                        <p>
                            We retain your data for as long as your account is active. If you wish to delete your account and all associated data,
                            please contact us and we will process your request promptly.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc pl-5 space-y-1.5 mt-2">
                            <li>Access the personal data we hold about you.</li>
                            <li>Request correction of inaccurate data.</li>
                            <li>Request deletion of your account and data.</li>
                            <li>Withdraw consent at any time.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Children&apos;s Privacy</h2>
                        <p>
                            Our app is rated 4+ and is suitable for all ages. It does not contain any objectionable content.
                            We do not knowingly collect personal information from children under 4 years of age.
                            The app is a menu management tool and does not target children as its primary audience.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. Any changes will be posted on this page
                            with an updated revision date. Continued use of the app after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy or wish to exercise your rights,
                            please contact us at: <a href="mailto:greenhills@gmail.com" className="text-blue-600 underline">greenhills@gmail.com</a>
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 text-center text-xs text-gray-300">
                    GreenHills Menu App
                </div>
            </div>
        </div>
    );
}
