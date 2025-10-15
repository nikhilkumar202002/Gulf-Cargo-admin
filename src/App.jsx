import React, { useEffect, useRef, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, clearAuth } from "./store/slices/authSlice";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import Preloader from "./components/Preloader";

export default function App() {
  const dispatch = useDispatch();
  const { token, status, user, sessionId } = useSelector((s) => s.auth || {});
  const [splashDone, setSplashDone] = useState(false);
  const bootstrappedTokenRef = useRef(null);

  const bcRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 500);
    return () => clearTimeout(t);
  }, []);

  // Bootstrap profile once per token
  useEffect(() => {
    if (!token) {
      bootstrappedTokenRef.current = null; // reset on logout
      return;
    }

    const alreadyBootstrapped = bootstrappedTokenRef.current === token;

    if (!alreadyBootstrapped && status === "idle" && !user) {
      bootstrappedTokenRef.current = token;
      dispatch(fetchProfile())
        .unwrap()
        .catch(() => {
          bootstrappedTokenRef.current = null;
          dispatch(clearAuth());
        });
    }
  }, [dispatch, token, status, user]);

 // Cross-tab logout & login awareness (same browser profile).
  useEffect(() => {
    // BroadcastChannel for instant tab messaging
    bcRef.current = new BroadcastChannel("auth");
    const bc = bcRef.current;
    bc.onmessage = (e) => {
      if (e?.data === "logout") dispatch(clearAuth());
      if (e?.data?.type === "session-update") {
        const incomingSid = e.data.sessionId;
        if (sessionId && incomingSid && incomingSid !== sessionId) {
          dispatch(clearAuth());
        }
      }
    };

    // storage event fires on other tabs when localStorage changes
    const onStorage = (ev) => {
      if (ev.key === "session_id") {
        if (sessionId && ev.newValue && ev.newValue !== sessionId) {
          dispatch(clearAuth());
        }
      }
      if (ev.key === "token" && !ev.newValue && token) {
        dispatch(clearAuth());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
      bc.close();
    };
  }, [dispatch, token, sessionId]);

  const authBootstrapping = Boolean(token) && (status === "idle" || status === "loading") && !user;
  const stillBlocking = !splashDone || authBootstrapping;

  if (stillBlocking) {
    return <Preloader duration={500} />;
  }

  return (
    <Suspense fallback={<div style={{ height: 2, background: "#eee" }} />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
