"use client";

import { useEffect, useRef, useState } from "react";
import type { Review } from "@/lib/types";

function getVisible() {
  if (typeof window === "undefined") return 3;
  if (window.innerWidth <= 640) return 1;
  if (window.innerWidth <= 992) return 2;
  return 3;
}

export default function TestimonialsSlider({ reviews }: { reviews: Review[] }) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(() => Math.min(getVisible(), Math.max(reviews.length, 1)));

  useEffect(() => {
    const onResize = () => setVisible(Math.min(getVisible(), Math.max(reviews.length, 1)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [reviews.length]);

  const maxIndex = Math.max(0, reviews.length - visible);
  const totalPages = Math.max(1, Math.ceil(reviews.length / visible));
  const activePage = Math.min(totalPages - 1, Math.round(index / visible));

  function goTo(i: number) {
    const next = Math.max(0, Math.min(i, maxIndex));
    setIndex(next);
    const slider = sliderRef.current;
    const cards = slider?.querySelectorAll<HTMLDivElement>(".testimonial-card");
    if (!slider || !cards || cards.length === 0) return;
    const cardWidth = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;
    slider.scrollTo({ left: next * cardWidth, behavior: "smooth" });
  }

  if (reviews.length === 0) {
    return (
      <div className="reviews-slider-wrap">
        <div className="reviews-slider">
          <div className="testimonial-card" style={{ textAlign: "center", color: "#888" }}>
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-slider-wrap">
      <button className="reviews-nav reviews-nav-prev" onClick={() => goTo(index - visible)} disabled={index <= 0} aria-label="Previous reviews">
        <i className="fas fa-chevron-left"></i>
      </button>
      <div className="reviews-slider" ref={sliderRef}>
        {reviews.map((review) => (
          <div className="testimonial-card" key={review.id}>
            <div className="testimonial-quote-icon">
              <i className="fas fa-quote-left"></i>
            </div>
            <div className="testimonial-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <i key={i} className={i < review.rating ? "fas fa-star" : "far fa-star"}></i>
              ))}
            </div>
            <p className="testimonial-comment">&quot;{review.comment}&quot;</p>
            <div className="testimonial-author">
              <div className="author-avatar">{review.customer_name?.[0]?.toUpperCase()}</div>
              <div className="author-info">
                <h4>{review.customer_name}</h4>
                <span>Verified Customer</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="reviews-nav reviews-nav-next" onClick={() => goTo(index + visible)} disabled={index >= maxIndex} aria-label="Next reviews">
        <i className="fas fa-chevron-right"></i>
      </button>
      {totalPages > 1 && (
        <div className="reviews-dots">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`reviews-dot${i === activePage ? " active" : ""}`}
              aria-label={`Go to review page ${i + 1}`}
              onClick={() => goTo(i * visible)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
