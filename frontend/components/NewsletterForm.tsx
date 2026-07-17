"use client";

import { useAppState } from "./AppStateProvider";

export default function NewsletterForm() {
  const { showToast } = useAppState();

  return (
    <form
      className="newsletter-form"
      onSubmit={(e) => {
        e.preventDefault();
        showToast("Thanks!", "You're subscribed for updates.");
        (e.target as HTMLFormElement).reset();
      }}
    >
      <input type="email" placeholder="Enter your email" required />
      <button type="submit" className="btn">
        Subscribe
      </button>
    </form>
  );
}
