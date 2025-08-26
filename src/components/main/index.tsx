"use client";

import React, { useState } from "react";
import Script from "next/script";
import Blind from "../blind";
import "./index.css";
import "./gradient-text.css";
import "./dark.css";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`app-container ${isDarkMode ? "dark" : ""}`}>
      <Script 
        src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
        strategy="afterInteractive"
      />
      <Script 
        id="kofi-widget-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              if (typeof kofiWidgetOverlay !== 'undefined') {
                kofiWidgetOverlay.draw('yorkl', {
                  'type': 'floating-chat',
                  'floating-chat.donateButton.text': 'Support Me',
                  'floating-chat.donateButton.background-color': '#323842',
                  'floating-chat.donateButton.text-color': '#fff'
                });
              } else {
                console.warn('load script failed');
              }
            });
          `
        }}
      />
      {/* header */}
      <header className="header" aria-label="header">
        <div className="logo" aria-label="logo">
          What Can See
        </div>
        <button
          className="dark-mode-toggle"
          onClick={toggleDarkMode}
          aria-label={`Switch to ${isDarkMode ? "Day Mode" : "Dark Mode"}`}
          aria-pressed={isDarkMode}>
          {isDarkMode ? "Day Mode" : "Dark Mode"}
        </button>
      </header>

      {/* Main */}
      <main className="main">
        {/* hero */}
        <div className="hero title">
          <h1>What Can See</h1>
          <p>View Without Barriers, Embrace Every Perspective.</p>
        </div>

        {/* Cards */}
        <div className="cards">
          <Blind />
        </div>
      </main>
      <footer>
        <h3>Website Introduction</h3>
        <ul>
          <li>
            Welcome to <b><i>What Can See</i></b> – a web tool that you can upload any image to see how it appears to people with visual impairments and color blindness.
          </li>
          <li>
            Our mission is to emphasize the importance of accessible design by
            empowering photographers, web, and app designers.
          </li>
          <li>
            Our simulations are inspired by open source projects and
            other websites, so we do not claim to represent the exact
            experiences of visually impaired and colorblind
            individuals. Just hope it can illuminate something to
            guide inclusive design practices.
          </li>
          <li>
            Inspiration from projects like <a href="https://www.whocanuse.com/?utm_source=What+Can+see" referrerPolicy="no-referrer">Who Can Use</a> and <a href="http://colorlab.wickline.org/colorblind/colorlab?utm_source=What+Can+see" referrerPolicy="no-referrer">ColorLab by
            Wickline</a>, <b><i>What Can See</i></b> is here to help you design digital
            experiences that are accessible to everyone.
          </li>
        </ul>
      </footer>
    </div>
  );
}

export default App;
