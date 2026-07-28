import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service | Matina Crafts',
  description: 'Terms governing use of the Matina Crafts online store.',
};

const sections = [
  {
    title: 'Agreement',
    body: 'By accessing matina crafts storefront or placing an order, you agree to these Terms of Service. If you do not agree, please do not use the site.',
  },
  {
    title: 'Products & pricing',
    body: 'We sell handmade goods from Nepal. Product images and descriptions aim to be accurate; slight variations in handmade items are expected. Prices may be shown in USD or NPR depending on your region setting. We may correct pricing or listing errors and cancel affected orders when necessary.',
  },
  {
    title: 'Orders & payment',
    body: 'An order is an offer to buy. We accept it when we confirm the order or charge payment. You must provide accurate shipping and contact details. Available payment methods (such as card via Stripe or cash on delivery where offered) are shown at checkout. You are responsible for any duties or import fees that apply in your country.',
  },
  {
    title: 'Shipping & returns',
    body: 'Delivery estimates are not guarantees. Risk of loss transfers according to our shipping terms and carrier practices. Returns are handled under our return policy as shown in your account or order communications; unused items in original condition may be eligible within the stated window.',
  },
  {
    title: 'Accounts',
    body: 'You are responsible for keeping login credentials confidential and for activity under your account. We may suspend accounts that misuse the site, attempt fraud, or violate these terms.',
  },
  {
    title: 'Intellectual property',
    body: 'Site content, branding, and product photography belong to Matina Crafts or our licensors. You may not copy or reuse them commercially without permission.',
  },
  {
    title: 'Limitation of liability',
    body: 'To the fullest extent allowed by law, Matina Crafts is not liable for indirect, incidental, or consequential damages arising from use of the site or products. Our total liability for any claim related to an order is limited to the amount you paid for that order.',
  },
  {
    title: 'Governing law',
    body: 'These terms are governed by applicable law in the United States for U.S. customers, without regard to conflict-of-law rules. Consumer protections in your place of residence may also apply and are not waived where prohibited.',
  },
  {
    title: 'Contact',
    body: 'Questions: info@bebenepal.com. We may update these terms; continued use after changes means you accept the revised terms.',
  },
];

export default function TermsPage() {
  return (
    <main className="w-full min-h-screen bg-[#FAF6F2] pt-28 pb-24 px-4 sm:px-6">
      <div className="container-custom max-w-3xl mx-auto">
        <p className="font-secondary text-xs uppercase tracking-[0.2em] text-[#664132]/70 mb-3">
          Legal
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#2A170F] mb-3">
          Terms of Service
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
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
