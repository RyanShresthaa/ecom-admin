import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | Matina Crafts',
  description: 'How Matina Crafts collects, uses, and protects your information.',
};

const sections = [
  {
    title: 'Who we are',
    body: 'Matina Crafts sells handmade Nepali crafts to customers in the United States and beyond. This Privacy Policy explains what information we collect when you browse our store, place an order, or join our newsletter, and how we use it.',
  },
  {
    title: 'Information we collect',
    body: 'Order details (name, shipping address, email, phone), account information when you register, newsletter email if you subscribe, and basic technical data such as browser type and pages visited needed to run and secure the site. Payment card data is handled by our payment processor (e.g. Stripe); we do not store full card numbers on our servers.',
  },
  {
    title: 'How we use information',
    body: 'We use your information to fulfill orders, provide customer support, send order updates, improve the storefront, prevent fraud and abuse, and — only if you opted in — send occasional newsletters about products and craft stories. We do not sell your personal information.',
  },
  {
    title: 'Sharing',
    body: 'We share data with service providers who help us operate (hosting, email, payments, shipping). They may only use your information to perform services for us. We may also disclose information when required by law or to protect our rights and customers.',
  },
  {
    title: 'Cookies & local storage',
    body: 'We use cookies and browser storage for session security (including CSRF protection), cart contents, and preference settings such as region/currency. You can clear these in your browser; some site features may stop working without them.',
  },
  {
    title: 'Data retention & security',
    body: 'We keep order and account records as long as needed for fulfillment, accounting, and legal obligations. We use reasonable technical and organizational measures to protect data, but no online system is perfectly secure.',
  },
  {
    title: 'Your choices',
    body: 'You may unsubscribe from the newsletter at any time via the link in those emails (or by contacting us). You may request access, correction, or deletion of personal data we hold about you, subject to legal exceptions, by emailing us.',
  },
  {
    title: 'Contact',
    body: 'Questions about privacy: matinacrafts@gmail.com. We may update this policy from time to time; the date below reflects the latest revision.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="w-full min-h-screen bg-[#FAF6F2] pt-28 pb-24 px-4 sm:px-6">
      <div className="container-custom max-w-3xl mx-auto">
        <p className="font-secondary text-xs uppercase tracking-[0.2em] text-[#664132]/70 mb-3">
          Legal
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#2A170F] mb-3">
          Privacy Policy
        </h1>
        <p className="font-secondary text-sm text-[#664132] mb-10">Last updated: July 23, 2026</p>

        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-heading text-xl text-[#2A170F] mb-2">{s.title}</h2>
              <p className="font-secondary text-sm sm:text-base leading-relaxed text-[#664132]">
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-12 font-secondary text-sm text-[#664132]">
          See also our{' '}
          <Link href="/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
