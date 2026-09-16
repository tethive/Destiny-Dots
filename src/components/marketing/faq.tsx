import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatINR, pricing, type Prices } from "@/lib/pricing";

export type FaqItem = { q: string; a: string };

export const generalFaqs: FaqItem[] = [
  {
    q: "What exactly is a “dot”?",
    a: "A dot is one milestone on a career path — like “SQL basics” or “Get certified: AWS SAA-C03”. Each dot bundles hand-picked videos, docs, projects and a checkpoint quiz, so you always know what to learn next and when you're done.",
  },
  {
    q: "Who creates the roadmaps?",
    a: "Every path is built and reviewed by the Destiny Dots team. We don't accept anonymous submissions, and fast-moving topics like AI are reviewed regularly so links don't go stale.",
  },
  {
    q: "Is it really free to start?",
    a: `Yes. The first ${pricing.freeDotsPerPath} dots of every path are free with an account, and you can see the full dot map of every roadmap before paying anything. No card needed to sign up.`,
  },
  {
    q: "Which domains are available?",
    a: "Eleven: Cybersecurity, Ethical Hacking, AI & Machine Learning, Cloud Computing, Data Engineering, Data Analysis, Blockchain, Full Stack Development, IoT, 5G Technology and AR/VR. Each has at least one complete career path, with more paths being added.",
  },
  {
    q: "Do I get a certificate from Destiny Dots?",
    a: "We point you to the globally recognised certifications employers ask for — AWS, Microsoft, Google, CompTIA, OSCP and more — and many paths end with a dedicated certification dot to prepare you for the exam.",
  },
];

export const pricingFaqs = (prices: Prices): FaqItem[] => [
  {
    q: "How do I pay?",
    a: "Payments are processed by Razorpay, so you can use UPI, debit or credit cards, netbanking and popular wallets. We never see or store your card details.",
  },
  {
    q: "What's the difference between a one-off unlock and Pro?",
    a: `A one-off unlock gives you a single dot (${formatINR(prices.dot)}) or a full path (${formatINR(prices.path)}) forever. Pro gives you every dot in every path for as long as you're subscribed — usually the better deal once you're past a couple of dots.`,
  },
  {
    q: "If I cancel Pro, do I lose my one-off unlocks?",
    a: "No. Anything you bought as a one-off stays unlocked forever, even if you cancel your subscription. Your progress is kept too.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your billing page and you keep Pro access until the end of the period you've paid for.",
  },
];

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={`item-${i}`}>
          <AccordionTrigger className="py-5 text-left text-base font-medium hover:no-underline">{item.q}</AccordionTrigger>
          <AccordionContent className="pb-5 text-[0.95rem] leading-[1.7] text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
