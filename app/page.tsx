
"use client";

import LanguageSwitcher from "@/components/language-switcher";
import { useLanguage } from "@/components/language-provider";
import { translations } from "@/components/translations";

export default function Home() {
  const { language } = useLanguage();
  const t = translations[language];

  const features = [
    {
      number: "01",
      title: t.feature1Title,
      description: t.feature1Description,
    },
    {
      number: "02",
      title: t.feature2Title,
      description: t.feature2Description,
    },
    {
      number: "03",
      title: t.feature3Title,
      description: t.feature3Description,
    },
  ];

  return (
    <main className="site-shell">
      <header className="navbar">
        <a className="wordmark" href="/" aria-label="ELVORA — home">
          elvora<span>®</span>
        </a>

        <nav className="nav-links" aria-label="Main navigation">
          <a href="#about">{t.about}</a>
          <a href="#features">{t.features}</a>
          <a href="#app">{t.app}</a>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <a className="nav-cta" href="/dashboard">
            {t.startJourney} <span>↗</span>
          </a>
        </div>
      </header>

      <section className="hero" id="start">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" />
            {t.personalSpace}
          </p>

          <h1>
            {t.heroTitle1}
            <br />
            {t.heroTitle2} <span>{t.heroTitleAccent}</span>
          </h1>

          <p className="hero-description">{t.heroDescription}</p>

          <div className="hero-actions">
            <a className="button-primary" href="/dashboard">
              {t.startJourney} <span>↗</span>
            </a>
            <a className="button-secondary" href="#about">
              {t.learnApproach}
            </a>
          </div>

          <div className="hero-note">
            <div className="note-mark">✳</div>
            <p>
              {t.oneStep}
              <br />
              {t.oneStep2}
            </p>
          </div>
        </div>

        <div
          className="hero-art"
          aria-label={language === "ru" ? "Абстрактная лавандовая скульптура" : "Abstract lavender sculpture"}
        >
          <div className="art-label art-label-top">
            <span>FIG. 001</span>
            <span>{t.innerSpace}</span>
          </div>

          <div className="orbital orbital-one" />
          <div className="orbital orbital-two" />
          <div className="orbital orbital-three" />

          <div className="moon">
            <div className="moon-highlight" />
          </div>

          <div className="art-caption">
            <span>01 / 03</span>
            <span>{t.findRhythm}</span>
          </div>

          <span className="art-side-note">{t.closerToYourself}</span>
        </div>

        <div className="hero-bottom">
          <span>{t.ideasSpace}</span>
          <a href="#about" aria-label={t.scrollDown}>
            {t.scrollDown} <span>↓</span>
          </a>
          <span>{t.realLife}</span>
        </div>
      </section>

      <section className="intro-section" id="about">
        <p className="eyebrow">{t.notAnotherList}</p>
        <h2>
          {t.introTitle}
          <br />
          <span>{t.introAccent}</span>
        </h2>
        <p className="intro-description">{t.introDescription}</p>
      </section>

      <section className="features-section" id="features">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.lessButBetter}</p>
            <h2>{t.featureHeading}</h2>
          </div>
          <p>{t.featureSubheading}</p>
        </div>

        <div className="feature-list">
          {features.map((feature) => (
            <article className="feature-row" key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <span className="feature-arrow" aria-hidden="true">
                ↗
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="app-section" id="app">
        <div className="app-copy">
          <p className="eyebrow">{t.yourSpaceAnywhere}</p>
          <h2>
            {t.yourPlans}
            <br />
            {t.yourPace.split(" ").slice(0, -1).join(" ")}{" "}
            <span>{t.yourPace.split(" ").slice(-1)}</span>
          </h2>
          <p>{t.appDescription}</p>
          <span className="coming-soon">{t.appComingSoon}</span>
        </div>

        <div className="phone-scene" aria-hidden="true">
          <div className="phone">
            <div className="phone-top">
              <span>9:41</span>
              <span>•••</span>
            </div>
            <div className="phone-brand">
              elvora<span>®</span>
            </div>
            <p className="phone-greeting">{t.todayGoodStart}</p>
            <div className="phone-card">
              <span>{t.yourFocus}</span>
              <h3>
                {t.startSmall.split(". ").map((part, index) => (
                  <span key={index}>
                    {part}
                    {index === 0 ? "." : ""}
                    {index === 0 && <br />}
                  </span>
                ))}
              </h3>
              <div className="phone-progress">
                <span />
              </div>
              <small>{t.oneStepAtTime}</small>
            </div>
            <div className="phone-task">
              <span className="task-check">✓</span>
              <span>{t.organizeIdeas}</span>
            </div>
            <div className="phone-task">
              <span className="task-circle" />
              <span>{t.chooseImportant}</span>
            </div>
            <div className="phone-task">
              <span className="task-circle" />
              <span>{t.startWithSmall}</span>
            </div>
            <div className="phone-tab-bar">
              <span>⌂</span>
              <span>◷</span>
              <span>✳</span>
              <span>○</span>
            </div>
          </div>
          <div className="phone-orbit" />
        </div>
      </section>

      <footer className="footer">
        <a className="wordmark" href="/">
          elvora<span>®</span>
        </a>
        <p>{t.footerTagline}</p>
        <span>{t.footerCopyright}</span>
      </footer>
    </main>
  );
}
