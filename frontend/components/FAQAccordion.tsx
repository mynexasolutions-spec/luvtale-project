"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What is your return policy?",
    a: "We offer a 30-day return policy for all unworn and unwashed items with original tags attached. Simply visit our returns portal to start your process.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes, we ship to over 50 countries worldwide! Shipping costs and delivery times vary by location and will be calculated at checkout.",
  },
  {
    q: "How can I track my order?",
    a: "Once your order ships, you'll receive an email with a tracking number and a link to follow your package's journey to your doorstep.",
  },
  {
    q: "Are your materials sustainable?",
    a: "We are committed to ethical fashion. 70% of our current collection is made from sustainable or recycled materials, and we're working towards 100% by 2027.",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="faq-container">
      {FAQS.map((item, i) => (
        <div key={item.q} className={`faq-item${openIndex === i ? " active" : ""}`}>
          <button className="faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
            {item.q}
            <i className="fas fa-chevron-down"></i>
          </button>
          <div className="faq-answer">
            <p>{item.a}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
