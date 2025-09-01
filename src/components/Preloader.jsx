import React from 'react'
import { useEffect, useState } from "react";
import PreLoadImage from "../assets/Logo.png"

function Preloader({ onDone, duration = 1800, fadeOut = true }) {

    const [progress, setProgress] = useState(1); 
    const [hide, setHide] = useState(false);

    useEffect(() => {
    const start = performance.now();
    let raf;

    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const p = Math.max(1, Math.min(100, Math.floor(1 + t * 99)));
      setProgress(p);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        if (fadeOut) {
          setTimeout(() => setHide(true), 150);
          setTimeout(() => onDone?.(), 450);
        } else {
          onDone?.();
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, fadeOut, onDone]);

  return (
    <>
        <div
      role="status"
      aria-label={`Loading ${progress}%`}
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        zIndex: 9999,
        transition: "opacity 300ms ease, visibility 300ms ease",
        opacity: hide ? 0 : 1,
        visibility: hide ? "hidden" : "visible",
      }}
    >
    
      <img
        src={PreLoadImage}
        alt="Gulf Cargo International"
        style={{ width: 200, height: "auto", objectFit: "contain" }}
      />

      <div
        style={{
          width: 320,
          height: 10,
          background: "#EDEFF3",
          borderRadius: 999,
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px #E3E7EE",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, #E11D2A 0%, #FF4A57 100%)", // red to match logo accent
            borderRadius: 999,
            transition: "width 80ms linear",
          }}
        />
      </div>

      <div
        style={{
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          fontSize: 14,
          color: "#11204B", // navy to match logo
          letterSpacing: 0.3,
        }}
      >
        {progress}%
      </div>
    </div>
    </>
  )
}

export default Preloader