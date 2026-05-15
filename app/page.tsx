'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  useEffect(() => {
    const navbar = document.getElementById('navbar');
    const handleScroll = () => {
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);

    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      {/* NAV */}
      <nav className="landing-nav" id="navbar">
        <a href="#home" className="nav-logo">AC <span>Alignment Church</span></a>
        <ul className="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#beliefs">Beliefs</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#connect">Connect</a></li>
          <li><a href="#give">Give</a></li>
          <li><a href="#media">Media</a></li>
          <li><a href="#connect" className="nav-cta">Join Us</a></li>
          <li><Link href="/login" className="nav-cta">Member Login</Link></li>
        </ul>
        <Link href="/login" className="nav-cta mobile-login">Member Login</Link>
      </nav>

      {/* HOME */}
      <section id="home">
        <div className="hero-cross"></div>
        <p className="hero-eyebrow">Southend-on-Sea · Est. 2026</p>
        <h1 className="hero-title">A Church<br />Built on <em>Alignment</em></h1>
        <p className="hero-verse">&ldquo;Your kingdom come, your will be done, on earth as it is in heaven.&rdquo;</p>
        <p className="hero-verse-ref">Matthew 6:10</p>
        <div className="hero-buttons">
          <a href="#services" className="btn-primary">Join Us This Sunday</a>
          <a href="#about" className="btn-outline">Discover Who We Are</a>
          <Link href="/login" className="btn-outline">Member Portal</Link>
        </div>
        <div className="hero-scroll">
          <span>Scroll</span>
          <div className="scroll-line"></div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about">
        <div className="about-image-side">
          <div className="about-pattern"></div>
          <div className="about-monogram">AC</div>
        </div>
        <div className="about-content">
          <p className="section-eyebrow reveal">Our Story</p>
          <h2 className="section-title reveal reveal-delay-1">A Community<br />Called to <em>Align</em></h2>
          <p className="section-body reveal reveal-delay-2">
            Alignment Church is a Spirit-led, apostolic community rooted in biblical truth and committed to seeing God&apos;s kingdom manifest in Southend-on-Sea and beyond. We were founded by Senior Leader Daniel Williams with a simple conviction — that the Church thrives when it aligns with the heart of God.
          </p>
          <p className="section-body reveal reveal-delay-3">
            We are a charitable community gathering at The Cornerstone, bringing together people from every walk of life to worship, grow, and serve together.
          </p>
          <div className="values-grid reveal reveal-delay-4">
            <div className="value-card">
              <h4>Biblical</h4>
              <p>Scripture is the foundation of everything we believe and practise.</p>
            </div>
            <div className="value-card">
              <h4>Apostolic</h4>
              <p>We embrace fivefold ministry and sent-out, kingdom-advancing culture.</p>
            </div>
            <div className="value-card">
              <h4>Community</h4>
              <p>Belonging and discipleship happen in relationship, not just attendance.</p>
            </div>
            <div className="value-card">
              <h4>Prophetic</h4>
              <p>We cultivate sensitivity to the voice and movement of the Holy Spirit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BELIEFS */}
      <section id="beliefs">
        <div className="beliefs-header">
          <p className="section-eyebrow reveal">What We Believe</p>
          <h2 className="section-title reveal reveal-delay-1">Our <em>Foundations</em></h2>
        </div>
        <div className="beliefs-grid">
          <div className="belief-card reveal">
            <div className="belief-number">01</div>
            <h3>Scripture</h3>
            <p>The Bible is the inspired, authoritative Word of God — our final guide for faith and conduct.</p>
          </div>
          <div className="belief-card reveal reveal-delay-1">
            <div className="belief-number">02</div>
            <h3>The Trinity</h3>
            <p>We believe in one God eternally existing as Father, Son, and Holy Spirit.</p>
          </div>
          <div className="belief-card reveal reveal-delay-2">
            <div className="belief-number">03</div>
            <h3>Salvation</h3>
            <p>Salvation is by grace through faith in Jesus Christ alone — his death and resurrection.</p>
          </div>
          <div className="belief-card reveal reveal-delay-3">
            <div className="belief-number">04</div>
            <h3>The Holy Spirit</h3>
            <p>We embrace the full work and gifts of the Holy Spirit, active in the Church today.</p>
          </div>
          <div className="belief-card reveal reveal-delay-1">
            <div className="belief-number">05</div>
            <h3>The Church</h3>
            <p>The Church is the body of Christ — called, equipped, and sent to advance his kingdom.</p>
          </div>
          <div className="belief-card reveal reveal-delay-2">
            <div className="belief-number">06</div>
            <h3>Fivefold Ministry</h3>
            <p>Apostles, prophets, evangelists, pastors, and teachers equip the saints for works of service.</p>
          </div>
        </div>
      </section>

      {/* SERVICES & EVENTS */}
      <section id="services">
        <div className="services-inner">
          <div className="services-header">
            <p className="section-eyebrow reveal">Gather With Us</p>
            <h2 className="section-title reveal reveal-delay-1">Services &amp; <em>Events</em></h2>
          </div>

          <div className="service-main reveal">
            <div>
              <p className="service-label">Sunday Gathering</p>
              <h3>Weekly Worship Service</h3>
              <p className="service-detail">
                Our Sunday service is a time of worship, the Word, and community. Expect spirit-filled praise, apostolic teaching, and space to encounter God. Everyone is welcome — come as you are.
              </p>
            </div>
            <dl className="service-meta">
              <div className="service-meta-item">
                <dt>Day</dt>
                <dd>Every Sunday</dd>
              </div>
              <div className="service-meta-item">
                <dt>Time</dt>
                <dd>2:00 PM</dd>
              </div>
              <div className="service-meta-item">
                <dt>Location</dt>
                <dd>The Cornerstone<br />Southend-on-Sea</dd>
              </div>
            </dl>
          </div>

          <div className="gold-divider reveal"><span>Upcoming Events</span></div>

          <div className="events-grid">
            <div className="event-card reveal">
              <div className="event-date">May</div>
              <h4>Prophetic Night</h4>
              <p>An evening of worship and prophetic ministry. Open to all.</p>
            </div>
            <div className="event-card reveal reveal-delay-1">
              <div className="event-date">Jun</div>
              <h4>Community Outreach</h4>
              <p>Serving Southend-on-Sea together. Details to follow.</p>
            </div>
            <div className="event-card reveal reveal-delay-2">
              <div className="event-date">Jun</div>
              <h4>Prayer &amp; Fasting Week</h4>
              <p>Corporate prayer and seeking the face of God as a community.</p>
            </div>
            <div className="event-card reveal reveal-delay-3">
              <div className="event-date">Jul</div>
              <h4>Teaching Series Launch</h4>
              <p>A new apostolic teaching series on kingdom identity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CONNECT */}
      <section id="connect">
        <div className="connect-inner">
          <div className="connect-info">
            <p className="section-eyebrow reveal">Get Connected</p>
            <h2 className="section-title reveal reveal-delay-1">We&apos;d Love to<br /><em>Meet You</em></h2>
            <p className="section-body reveal reveal-delay-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Whether you&apos;re new to faith or looking for a spiritual home, there&apos;s a place for you at Alignment Church. Reach out, submit a prayer request, or come visit us on Sunday.
            </p>
            <div className="connect-links reveal reveal-delay-3">
              <Link href="/prayer-wall" className="connect-link">
                <span className="connect-link-icon">🙏</span>
                <dl className="connect-link-text">
                  <dt>Prayer Requests</dt>
                  <dd>Submit a prayer request</dd>
                </dl>
              </Link>
              <a href="https://alignmentchurch.uk" className="connect-link" target="_blank" rel="noopener noreferrer">
                <span className="connect-link-icon">🌐</span>
                <dl className="connect-link-text">
                  <dt>Website</dt>
                  <dd>alignmentchurch.uk</dd>
                </dl>
              </a>
              <div className="connect-link">
                <span className="connect-link-icon">📍</span>
                <dl className="connect-link-text">
                  <dt>Location</dt>
                  <dd>The Cornerstone, Southend-on-Sea</dd>
                </dl>
              </div>
              <div className="connect-link">
                <span className="connect-link-icon">📧</span>
                <dl className="connect-link-text">
                  <dt>Email</dt>
                  <dd>hello@alignmentchurch.uk</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="connect-form reveal reveal-delay-2">
            <h3>Send a Message</h3>
            <div className="form-group">
              <input type="text" placeholder="Your Name" />
            </div>
            <div className="form-group">
              <input type="email" placeholder="Email Address" />
            </div>
            <div className="form-group">
              <input type="text" placeholder="Subject" />
            </div>
            <div className="form-group">
              <textarea placeholder="Your message…"></textarea>
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Send Message</button>
          </div>
        </div>
      </section>

      {/* GIVE */}
      <section id="give">
        <div className="give-inner">
          <p className="section-eyebrow reveal">Generosity</p>
          <h2 className="section-title reveal reveal-delay-1">Give to the <em>Kingdom</em></h2>
          <p className="section-body reveal reveal-delay-2" style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 620, margin: '0 auto 0.5rem' }}>
            Your generosity fuels the mission of Alignment Church — from community outreach to establishing a space where people encounter God. Every gift matters.
          </p>
          <p className="give-scripture reveal reveal-delay-3">&ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion.&rdquo;</p>
          <p className="give-ref reveal reveal-delay-4">2 Corinthians 9:7</p>
          <div className="give-options">
            <div className="give-option reveal">
              <span className="give-option-icon">📱</span>
              <h3>Contactless</h3>
              <p>Give seamlessly in-person via our contactless giving point at every Sunday service.</p>
            </div>
            <div className="give-option reveal reveal-delay-1">
              <span className="give-option-icon">💳</span>
              <h3>Online via Monzo</h3>
              <p>Quick and secure giving online through our Monzo giving link — anytime, anywhere.</p>
            </div>
            <div className="give-option reveal reveal-delay-2">
              <span className="give-option-icon">🏦</span>
              <h3>Bank Transfer</h3>
              <p>Set up a regular standing order or one-off gift direct to our church account.</p>
            </div>
          </div>
          <p className="give-charity reveal">Alignment Church · Registered Charity (CIO) · Charity Commission for England &amp; Wales</p>
        </div>
      </section>

      {/* MEDIA */}
      <section id="media">
        <div className="media-inner">
          <div className="media-header">
            <p className="section-eyebrow reveal">Watch &amp; Listen</p>
            <h2 className="section-title reveal reveal-delay-1">Sermons &amp; <em>Media</em></h2>
          </div>
          <div className="media-grid">
            <div className="media-card reveal">
              <div className="media-card-thumb"></div>
              <div className="media-card-body">
                <p className="media-tag">Sermon Series</p>
                <h3>Kingdom Identity</h3>
                <p>Apostolic teaching on who you are in Christ and your purpose in the kingdom.</p>
              </div>
            </div>
            <div className="media-card reveal reveal-delay-1">
              <div className="media-card-thumb"></div>
              <div className="media-card-body">
                <p className="media-tag">Prophetic</p>
                <h3>A Word for This Season</h3>
                <p>Prophetic declarations and video content released through our Instagram channel.</p>
              </div>
            </div>
            <div className="media-card reveal reveal-delay-2">
              <div className="media-card-thumb"></div>
              <div className="media-card-body">
                <p className="media-tag">Teaching</p>
                <h3>Foundations of Faith</h3>
                <p>Core biblical teachings for new and growing believers in the Alignment community.</p>
              </div>
            </div>
          </div>
          <div className="social-strip reveal">
            <p>Follow us on social media</p>
            <div className="social-icons">
              <a href="https://instagram.com/alignmentchurch" className="social-icon" target="_blank" rel="noopener noreferrer" title="Instagram">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="#" className="social-icon" title="YouTube">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42A2.78 2.78 0 0 0 20.6 4.5C18.88 4 12 4 12 4s-6.88 0-8.6.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.5C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.94A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="#" className="social-icon" title="Facebook">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="#" className="social-icon" title="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.74a4.85 4.85 0 01-1.01-.05z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p className="logo">Alignment Church</p>
        <p>The Cornerstone, Southend-on-Sea · hello@alignmentchurch.uk</p>
        <p style={{ marginTop: '0.5rem' }}>© 2026 Alignment Church · Registered CIO · &ldquo;Your kingdom come, your will be done.&rdquo; — Matthew 6:10</p>
        <p style={{ marginTop: '1rem' }}>
          <Link href="/login" style={{ color: 'rgba(198,167,94,0.6)', textDecoration: 'none', fontSize: '0.78rem', letterSpacing: '0.1em' }}>
            Member Portal →
          </Link>
        </p>
      </footer>
    </div>
  );
}
