import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/brand/BrandMark'

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h2 className="font-display text-lg font-semibold text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-slate-600">{children}</div>
  </section>
)

export default function Terms() {
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
              <p className="text-xs text-slate-500">Terms of Service</p>
            </div>
          </div>
          <Link to="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Back to login
          </Link>
        </div>

        <div className="card p-6 sm:p-10 space-y-8">
          <header className="space-y-3 border-b border-slate-100 pb-6">
            <h1 className="font-display text-3xl font-bold text-slate-900">Terms of Service</h1>
            <p className="text-sm text-slate-500">Last updated: May 9, 2026 | Effective date: May 9, 2026</p>
            <p className="text-sm leading-7 text-slate-600">
              Please read these Terms of Service carefully before using Zevio. By accessing or using the platform, you agree to be bound by these terms.
            </p>
          </header>

          <Section title="1. Definitions">
            <ul className="list-disc space-y-1 pl-5">
              <li><span className="font-medium text-slate-800">Zevio</span> means our SaaS platform, website, dashboard, and related services</li>
              <li><span className="font-medium text-slate-800">Tenant</span> means a business that has been onboarded to use Zevio</li>
              <li><span className="font-medium text-slate-800">End Customer</span> means a customer of a Tenant who interacts through WhatsApp</li>
              <li><span className="font-medium text-slate-800">Platform</span> means the Zevio web dashboard and backend services</li>
              <li><span className="font-medium text-slate-800">WhatsApp Integration</span> means the WhatsApp Cloud API features available through Zevio</li>
            </ul>
          </Section>

          <Section title="2. Eligibility and Account Access">
            <p>Access to Zevio may be invitation-based or otherwise restricted to approved business users.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Provide accurate information during onboarding</li>
              <li>Keep your login credentials confidential</li>
              <li>Notify us immediately if you suspect unauthorized access to your account</li>
              <li>Ensure that only authorized users access your account</li>
            </ul>
            <p>You are responsible for activity that occurs under your account credentials.</p>
          </Section>

          <Section title="3. Acceptable Use">
            <p>You agree to use Zevio only for lawful business purposes.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Send spam, unsolicited bulk messages, or promotional content without consent</li>
              <li>Send misleading, fraudulent, abusive, or deceptive messages</li>
              <li>Violate Meta’s WhatsApp Business policies or messaging rules</li>
              <li>Collect or store sensitive personal data beyond what is necessary for the service</li>
              <li>Attempt to reverse engineer, hack, disrupt, or overload the platform</li>
              <li>Resell, sublicense, or redistribute access to the platform without written consent</li>
              <li>Use the platform for illegal activity, harassment, discrimination, fraud, or abuse</li>
              <li>Send prohibited content, including content restricted by applicable law or platform policy</li>
            </ul>
            <p>
              Use of WhatsApp through Zevio must always comply with Meta’s applicable policies. Meta may restrict or ban WhatsApp Business accounts independently of any action taken by Zevio.
            </p>
          </Section>

          <Section title="4. WhatsApp Business API Usage">
            <p>If you use the WhatsApp integration, you agree that:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>You are responsible for obtaining proper consent from End Customers</li>
              <li>You will use approved message templates where required</li>
              <li>You will honor opt-out requests where applicable</li>
              <li>You will not use WhatsApp messaging for prohibited purposes</li>
              <li>Your WhatsApp Business Account may be reviewed, restricted, or suspended by Meta at its discretion</li>
            </ul>
            <p>Zevio is not responsible for actions taken by Meta against your WhatsApp Business Account.</p>
          </Section>

          <Section title="5. AI and Automated Messaging">
            <p>Zevio may use AI services to generate automated responses to customer messages.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>AI-generated responses may be inaccurate, incomplete, or outdated</li>
              <li>You are responsible for the business information and context you provide</li>
              <li>You should review AI-generated responses before relying on them for critical business decisions</li>
              <li>AI message content may be processed by third-party AI service providers as needed to deliver the service</li>
            </ul>
          </Section>

          <Section title="6. Data Responsibilities">
            <p>As a Tenant, you are generally the data controller for your End Customers’ data.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Having a lawful basis for collecting and processing End Customer data</li>
              <li>Providing appropriate privacy notices to your End Customers</li>
              <li>Handling deletion requests from your End Customers where required</li>
              <li>Ensuring your use of Zevio complies with applicable data protection laws</li>
            </ul>
            <p>Zevio acts as a data processor on your behalf in relation to Tenant-provided customer data.</p>
          </Section>

          <Section title="7. Platform Availability">
            <p>We aim to provide a reliable service, but we do not guarantee uninterrupted or error-free availability.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Third-party service outages, including Meta, AI providers, and infrastructure providers</li>
              <li>Scheduled maintenance</li>
              <li>Network failures</li>
              <li>Events outside our reasonable control</li>
            </ul>
          </Section>

          <Section title="8. Intellectual Property">
            <p>
              All software, design, code, and content that make up the Zevio platform are owned by us or our licensors and are protected by intellectual property laws.
            </p>
            <p>You may not copy, modify, distribute, reverse engineer, or create derivative works from the platform except as expressly permitted in writing.</p>
            <p>
              You retain ownership of your business data, customer data, and content that you upload to the platform. You grant us a limited license to process that data only as needed to provide the service.
            </p>
          </Section>

          <Section title="9. Confidentiality">
            <p>
              Both parties agree to protect non-public information shared during the business relationship, including login credentials, API keys, business data, and pricing information.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>To the maximum extent permitted by law, Zevio will not be liable for:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, revenue, or business opportunities</li>
              <li>Data loss or corruption beyond our reasonable control</li>
              <li>Decisions made based on AI-generated responses</li>
              <li>Losses resulting from restrictions imposed by Meta or other third parties</li>
            </ul>
            <p>
              To the extent permitted by law, our total liability for any claim will not exceed the amount paid by you to us in the three months preceding the event giving rise to the claim.
            </p>
          </Section>

          <Section title="11. Indemnification">
            <p>
              You agree to indemnify and hold harmless Zevio, its owners, employees, and contractors from claims, damages, losses, and expenses arising from:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Your violation of these Terms</li>
              <li>Your violation of Meta’s WhatsApp policies</li>
              <li>Your misuse of customer data</li>
              <li>Content or messages sent through your account</li>
              <li>Your breach of applicable law</li>
            </ul>
          </Section>

          <Section title="12. Termination">
            <p>We may suspend or terminate your access to Zevio if:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>You violate these Terms</li>
              <li>You violate Meta’s WhatsApp policies</li>
              <li>Your account shows signs of fraudulent, abusive, or harmful activity</li>
              <li>Required fees are not paid, if applicable</li>
              <li>Continued access could create legal, security, or operational risk</li>
            </ul>
            <p>
              After termination, we may retain certain data for a limited period for legal, security, and operational reasons, and then delete it in accordance with our Privacy Policy and applicable law.
            </p>
          </Section>

          <Section title="13. Modifications to Terms">
            <p>
              We may update these Terms from time to time. When we make material changes, we will take reasonable steps to notify Tenant administrators before the updated Terms take effect.
            </p>
            <p>Continued use of Zevio after the effective date means you accept the updated Terms.</p>
          </Section>

          <Section title="14. Governing Law">
            <p>
              These Terms are governed by the laws of India. Any disputes arising out of or relating to these Terms will be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana, India.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>For questions about these Terms, contact:</p>
            <p className="font-medium text-slate-900">dhineshkumarthota@gmail.com</p>
          </Section>
        </div>
      </div>
    </div>
  )
}
