import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/brand/BrandMark'

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-slate-600">{children}</div>
  </section>
)

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 py-10 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-200 opacity-30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl animate-fade-in">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandMark className="h-12 w-12" iconClassName="h-5 w-5" />
            <div>
              <p className="font-display text-lg font-bold text-slate-900">Zevio</p>
              <p className="text-xs text-slate-500">Privacy Policy</p>
            </div>
          </div>
          <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Back to login
          </Link>
        </div>

        <div className="card p-6 sm:p-10 space-y-8">
          <header className="space-y-3 border-b border-slate-100 pb-6">
            <h1 className="font-display text-3xl font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-sm text-slate-500">Last updated: May 9, 2026 | Effective date: May 9, 2026</p>
            <p className="text-sm leading-7 text-slate-600">
              This Privacy Policy explains how Zevio ("we", "us", or "our") collects, uses, discloses, and protects information when you use our platform.
            </p>
          </header>

          <Section title="1. Who We Are">
            <p>
              Zevio is a multi-tenant SaaS platform that helps businesses manage customer bookings, automate WhatsApp conversations using AI, and operate through a web dashboard.
            </p>
            <p>
              For purposes of data protection law, our Tenant businesses are generally the data controllers for their end customers’ data, and Zevio acts as a data processor on their behalf.
            </p>
            <p>
              If you have questions about this Privacy Policy, contact us at <span className="font-medium text-slate-900">dhineshkumarthota@gmail.com</span>.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="font-medium text-slate-800">2.1 Information from Tenant Businesses</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Business name, city, and contact details provided during onboarding</li>
              <li>Admin user name and email address</li>
              <li>WhatsApp Business phone number details and access credentials</li>
              <li>Service and pricing information entered into the platform</li>
              <li>AI context text describing business rules, offerings, and workflow preferences</li>
            </ul>
            <p className="font-medium text-slate-800">2.2 Information from End Customers</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>WhatsApp phone number</li>
              <li>Name, if shared during a conversation</li>
              <li>Message content exchanged with the AI chatbot</li>
              <li>Booking details such as service type, date, time, address, and locality</li>
              <li>Location or area details shared during booking</li>
            </ul>
            <p className="font-medium text-slate-800">2.3 Technical Information</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Server logs, including IP addresses and request timestamps</li>
              <li>Error logs and diagnostic information</li>
              <li>Basic usage and security information needed to operate the service</li>
            </ul>
          </Section>

          <Section title="3. How We Use Information">
            <ul className="list-disc space-y-1 pl-5">
              <li>Operate and deliver the Zevio platform</li>
              <li>Process and manage bookings on behalf of Tenant businesses</li>
              <li>Power AI-assisted WhatsApp responses</li>
              <li>Authenticate dashboard users and protect accounts</li>
              <li>Monitor platform health and resolve technical issues</li>
              <li>Comply with legal and regulatory obligations</li>
            </ul>
          </Section>

          <Section title="4. WhatsApp and Meta Platform Data">
            <p>
              Zevio integrates with the WhatsApp Business Cloud API provided by Meta Platforms, Inc. By using our platform, you understand and acknowledge that WhatsApp message data may pass through Meta’s infrastructure before reaching our systems.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>We process WhatsApp messages only to provide booking and automation services</li>
              <li>We do not use WhatsApp message content for advertising or marketing</li>
              <li>We do not sell WhatsApp message data to third parties</li>
              <li>Use of WhatsApp through Zevio is also subject to Meta’s terms and policies</li>
            </ul>
            <p>
              Where supported by the Tenant’s workflow, end customers may opt out of further messaging by replying <span className="font-medium text-slate-900">STOP</span>.
            </p>
          </Section>

          <Section title="5. Data Storage and Security">
            <ul className="list-disc space-y-1 pl-5">
              <li>Encryption of sensitive credentials where applicable</li>
              <li>Secure transmission using HTTPS/TLS</li>
              <li>Role-based access controls</li>
              <li>JWT-based dashboard authentication</li>
              <li>Multi-tenant data isolation</li>
              <li>Password hashing using bcrypt or a similar secure hashing method</li>
            </ul>
            <p>
              We store data on secure cloud infrastructure and use third-party infrastructure providers to operate the platform.
            </p>
          </Section>

          <Section title="6. Data Sharing and Third Parties">
            <p>We do not sell your personal data.</p>
            <p>We may share information only with service providers that help us operate the platform, including:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Meta Platforms, for WhatsApp Cloud API functionality</li>
              <li>AI service providers, for generating automated responses</li>
              <li>Database and infrastructure providers</li>
              <li>Law enforcement or regulators, when required by law or valid legal process</li>
            </ul>
          </Section>

          <Section title="7. Data Retention">
            <p>We retain information only as long as needed for the purposes described in this policy, unless a longer retention period is required by law.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Conversation messages: retained for up to 90 days</li>
              <li>Booking records: retained for up to 3 years</li>
              <li>Customer records: retained while the Tenant account is active</li>
              <li>Tenant account data: deleted within a reasonable period after account termination, unless retention is required by law</li>
            </ul>
          </Section>

          <Section title="8. Your Rights">
            <p>Depending on your location, you may have the right to access, correct, delete, restrict, or obtain a portable copy of your personal data.</p>
            <p>
              To exercise these rights, email <span className="font-medium text-slate-900">dhineshkumarthota@gmail.com</span>. We will respond within a reasonable time, and where required by law, within the applicable legal deadline.
            </p>
          </Section>

          <Section title="9. Data Deletion Requests">
            <p>
              You may request deletion of your data by emailing <span className="font-medium text-slate-900">dhineshkumarthota@gmail.com</span> with the subject line <span className="font-medium text-slate-900">Data Deletion Request</span>.
            </p>
            <p>We may retain certain records where required for legal, security, accounting, or legitimate business purposes.</p>
          </Section>

          <Section title="10. Cookies and Browser Storage">
            <p>
              Our dashboard uses essential browser storage to maintain authentication and session functionality. We do not use third-party advertising cookies or tracking cookies for marketing purposes.
            </p>
          </Section>

          <Section title="11. Children’s Privacy">
            <p>
              Zevio is a business platform and is not directed to children under 13. We do not knowingly collect personal data from children.
            </p>
            <p>If you believe a child has provided personal data, contact us immediately.</p>
          </Section>

          <Section title="12. International Data Transfers">
            <p>
              Your information may be processed in countries other than your own. By using Zevio, you understand that your data may be transferred and processed in those locations as needed to provide the service.
            </p>
          </Section>

          <Section title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. When we make material changes, we will take reasonable steps to notify Tenant administrators before the changes take effect.
            </p>
            <p>Continued use of Zevio after the effective date of an updated policy means you accept the revised terms of this Privacy Policy.</p>
          </Section>

          <Section title="14. Contact Us">
            <p>For privacy-related questions or requests, contact:</p>
            <p className="font-medium text-slate-900">dhineshkumarthota@gmail.com</p>
          </Section>
        </div>
      </div>
    </div>
  )
}
