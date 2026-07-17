"use client";

import { useAppState } from "./AppStateProvider";

export default function ContactForm() {
  const { showToast } = useAppState();

  return (
    <form
      className="contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        showToast("Message sent!", "We will get back to you soon.");
        (e.target as HTMLFormElement).reset();
      }}
    >
      <div className="form-row">
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" placeholder="Jane Doe" required />
        </div>
        <div className="form-group">
          <label>Email Address</label>
          <input type="email" placeholder="jane@example.com" required />
        </div>
      </div>
      <div className="form-group">
        <label>Subject</label>
        <input type="text" placeholder="Inquiry about..." required />
      </div>
      <div className="form-group">
        <label>Message</label>
        <textarea placeholder="Tell us how we can help..." rows={5} required />
      </div>
      <button type="submit" className="btn btn-primary">
        Send Message
      </button>
    </form>
  );
}
