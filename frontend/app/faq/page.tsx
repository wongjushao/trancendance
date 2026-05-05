// app/faq/page.tsx
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";

export default function FAQPage() {
  // Mock FAQ data - replace with real data from your database later
  const allFaqs = [
    {
      category: "General",
      questions: [
        { q: "What is Educatorio?", a: "Educatorio is a leading online learning platform offering thousands of courses from world-class universities and companies." },
        { q: "Who can use Educatorio?", a: "Anyone! Whether you're a student, professional, or organization, Educatorio has courses tailored to your needs." },
        { q: "Is Educatorio free?", a: "We offer a free plan with access to 2,000+ courses. For premium features and certificates, check out our Pro plan." },
      ]
    },
    {
      category: "Learning",
      questions: [
        { q: "How do I start a course?", a: "Simply browse our course catalog, click on any course, and hit 'Enroll Now'. You can start learning immediately!" },
        { q: "Can I learn at my own pace?", a: "Absolutely! All courses are self-paced. You can start, pause, or resume anytime." },
        { q: "Do I get a certificate?", a: "Yes! Complete paid courses to earn shareable certificates recognized by employers worldwide." },
      ]
    },
    {
      category: "Billing",
      questions: [
        { q: "What payment methods do you accept?", a: "We accept all major credit cards, PayPal, and bank transfers for enterprise plans." },
        { q: "Can I cancel my subscription?", a: "Yes, you can cancel anytime from your account settings. No questions asked." },
        { q: "Do you offer refunds?", a: "We offer a 14-day money-back guarantee for annual subscriptions." },
      ]
    },
    {
      category: "Organizations",
      questions: [
        { q: "How does team billing work?", a: "We offer per-seat licensing with volume discounts for teams of 5 or more." },
        { q: "Can I track team progress?", a: "Yes! Organization admins get access to detailed analytics and reporting dashboards." },
        { q: "Do you offer SSO?", a: "Yes, we support SAML SSO for enterprise plans." },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0B0F] to-[#13131A]">
      {/* Simple Header */}
      <header className="border-b border-white/10 bg-[#0B0B0F]/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <span className="font-black text-white text-sm">E</span>
              </div>
              <span className="text-lg font-bold text-white">Educatorio</span>
            </Link>
            <Link 
              href="/" 
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-5xl font-bold text-white mb-4 text-center">Frequently Asked Questions</h1>
        <p className="text-gray-400 text-center mb-12">Find answers to common questions about Educatorio</p>
        
        <div className="space-y-12">
          {allFaqs.map((category, idx) => (
            <div key={idx}>
              <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-purple-500/30 inline-block">
                {category.category}
              </h2>
              <div className="space-y-4 mt-6">
                {category.questions.map((item, i) => (
                  <details key={i} className="group rounded-xl border border-white/10 bg-white/5 p-6 hover:border-purple-500/30 transition-colors">
                    <summary className="font-semibold text-white flex justify-between items-center cursor-pointer list-none">
                      {item.q}
                      <ChevronRight size={18} className="group-open:rotate-90 transition-transform text-purple-400" />
                    </summary>
                    <p className="text-gray-400 mt-4 leading-relaxed">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Still have questions? */}
        <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Still have questions?</h3>
          <p className="text-gray-400 mb-4">Can't find what you're looking for? Contact our support team.</p>
          <Link 
            href="/contact" 
            className="inline-flex items-center gap-2 text-purple-400 font-semibold hover:gap-3 transition-all group"
          >
            Contact Support
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </main>
    </div>
  );
}