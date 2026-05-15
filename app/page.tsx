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
          <li><a href="#leaders">Leadership</a></li>
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
          <p className="section-eyebrow reveal">Who We Are</p>
          <h2 className="section-title reveal reveal-delay-1">A Church Aligned with the <em>Will of God</em></h2>
          <p className="section-body reveal reveal-delay-2">
            Alignment Church is an apostolic, Spirit-led community based in Southend-on-Sea. We exist to see people, cities, and nations aligned with the will, purposes, and agenda of God on the earth — rooted in the prayer of Jesus: &ldquo;Your kingdom come, your will be done, on earth as it is in heaven.&rdquo;
          </p>
          <p className="section-body reveal reveal-delay-3">
            We are a community built on prayer, the Word, discipleship, and Kingdom impact. We believe transformation begins within — and that Spirit-led believers, living in obedience to the Father, carry the culture of heaven into every area of life.
          </p>
          <div className="values-grid reveal reveal-delay-4">
            <div className="value-card">
              <span className="value-icon">✦</span>
              <h4>Internal Alignment</h4>
              <p>True transformation through healing, deliverance, and restoration of the soul</p>
            </div>
            <div className="value-card">
              <span className="value-icon">✦</span>
              <h4>Waiting on the Lord</h4>
              <p>A culture of stillness, prayer, and attentiveness to God — Psalm 46:10</p>
            </div>
            <div className="value-card">
              <span className="value-icon">✦</span>
              <h4>Obedience to the Will of God</h4>
              <p>The highest purpose of life is to know and do the will of the Father — John 4:34</p>
            </div>
            <div className="value-card">
              <span className="value-icon">✦</span>
              <h4>Authority of Scripture</h4>
              <p>The Word of God is our foundation and standard for truth — 2 Timothy 3:16</p>
            </div>
          </div>
        </div>
      </section>

      {/* LEADERS */}
      <section id="leaders" className="leaders-section">
        <div className="leaders-inner">
          <div className="leaders-image reveal">
            <img src="/images/daniel-and-rachael.jpg" alt="Pastor Daniel and Rachael Williams" className="leaders-photo" />
          </div>
          <div className="leaders-content">
            <p className="section-eyebrow reveal">Senior Leaders</p>
            <div className="leaders-rule reveal reveal-delay-1"></div>
            <h2 className="leaders-names reveal reveal-delay-1">Pastor Daniel &amp; Rachael Williams</h2>
            <p className="leaders-role reveal reveal-delay-2">Senior Leader &amp; Co-Leader · Alignment Church Southend</p>
            <p className="leaders-bio reveal reveal-delay-2">
              Daniel Williams is the Senior Leader and Founder of Alignment Church Southend. He carries an apostolic heart to see the Kingdom of God expanded on earth and is passionate about helping people align with God&apos;s purpose for their lives.
            </p>
            <p className="leaders-bio reveal reveal-delay-3">
              Alongside ministry, Daniel works as a Business Analyst and runs a Christian CIC, Naba Studios, a media platform dedicated to sharing Godly creativity and inspiring faith-based content online. He has previously served in church leadership roles with a focus on preaching, teaching, and developing healthy, growing churches.
            </p>
            <p className="leaders-bio reveal reveal-delay-3">
              Daniel is married to Rachael, and together they have a daughter, Kyomi. Rachael and Daniel share a deep commitment to mentoring and supporting people both locally and further afield.
            </p>
            <p className="leaders-bio reveal reveal-delay-4">
              Their call to church planting came through a shared journey of prayer, prophetic confirmation, and discernment. Alongside trusted mentors and accountability leaders who prayed with them and helped confirm the direction, they became united in the conviction that God was leading them to plant Alignment Church Southend. Their ministry is rooted in obedience, faith, and a desire to build what God is establishing in this generation.
            </p>
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
          {[
            { title: 'The Bible', body: 'We believe the Bible is the inspired, infallible, and authoritative Word of God.', ref: '2 Timothy 3:16' },
            { title: 'The One True God', body: 'We believe in one God who eternally exists as Father, Son, and Holy Spirit.', ref: 'Deuteronomy 6:4' },
            { title: 'Jesus Christ', body: 'Jesus Christ is the Son of God, fully God and fully man, who died and rose again for the salvation of humanity.', ref: 'John 3:16' },
            { title: 'Salvation', body: 'Salvation is the gift of God received by grace through faith in Jesus Christ.', ref: 'Ephesians 2:8' },
            { title: 'The Holy Spirit', body: 'The Holy Spirit indwells believers and empowers them to live Spirit-led lives.', ref: 'Romans 8:14' },
            { title: 'The Gifts of the Spirit', body: 'We believe the gifts of the Holy Spirit continue to operate today for the building up of the Church.', ref: '1 Corinthians 12:7' },
            { title: 'The Fivefold Ministry', body: 'We believe Christ has given apostles, prophets, evangelists, pastors, and teachers to equip the Church.', ref: 'Ephesians 4:11–12' },
            { title: 'The Sacraments', body: 'We practise believer\'s baptism and the Lord\'s Supper as acts of obedience and expressions of faith.', ref: 'Matthew 28:19' },
            { title: 'Transformation and Deliverance', body: 'We believe believers can experience healing, restoration, and freedom through the work of the Holy Spirit.', ref: 'Luke 4:18' },
            { title: 'The Church', body: 'The Church is the body of Christ, called to worship God, disciple believers, and proclaim the Kingdom.', ref: 'Colossians 1:18' },
            { title: 'The Kingdom of God', body: 'The Kingdom of God is the reign and rule of God revealed through Jesus Christ and expressed through His Church.', ref: 'Matthew 6:10' },
            { title: 'The Return of Christ', body: 'Jesus Christ will return again to establish the fullness of His Kingdom.', ref: 'Acts 1:11' },
            { title: 'Eternal Life', body: 'Those who belong to Christ will inherit eternal life with God.', ref: 'John 11:25' },
          ].map((b, i) => (
            <div key={b.title} className={`belief-card reveal${i % 2 === 1 ? ' reveal-delay-1' : ''}`}>
              <h3>{b.title}</h3>
              <p>{b.body}</p>
              <p className="belief-ref">{b.ref}</p>
            </div>
          ))}
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
