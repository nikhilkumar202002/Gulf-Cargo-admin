import React, { useEffect, useRef, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, clearAuth } from "./store/slices/authSlice";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import Preloader from "./components/Preloader";

export default function App() {
  const dispatch = useDispatch();
  const { token, status, user } = useSelector((s) => s.auth || {});
  const [splashDone, setSplashDone] = useState(false);

  // JS version: no TypeScript generic here
  const bootstrappedTokenRef = useRef(null);

  // One-time splash
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
