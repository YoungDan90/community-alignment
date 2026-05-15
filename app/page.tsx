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
              <div className="connect-link">
                <span className="connect-link-icon">📍</span>
                <dl className="connect-link-text">
                  <dt>Location</dt>
                  <dd>The Cornerstone URC, Bournemouth Park Rd, Southend-on-Sea SS2 5JL</dd>
                </dl>
              </div>
              <div className="connect-link">
                <span className="connect-link-icon">📧</span>
                <dl className="connect-link-text">
                  <dt>Email</dt>
                  <dd>info@alignmentchurch.uk</dd>
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

      {/* FOOTER */}
      <footer className="landing-footer">
        <p className="logo">Alignment Church</p>
        <p>The Cornerstone URC, Bournemouth Park Rd, Southend-on-Sea SS2 5JL · info@alignmentchurch.uk</p>
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
