import React, { useEffect, useState, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, clearAuth } from "./store/slices/authSlice";
import { RouterProvider } from "react-router-dom";
import router from "./router/router";
import Preloader from "./components/Preloader";

export default function App() {
  const dispatch = useDispatch();
  const { token, status, user } = useSelector((s) => s.auth || {});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (status === "idle" && !user) {
      dispatch(fetchProfile())
        .unwrap()
        .catch(() => dispatch(clearAuth()));
    }
  }, [dispatch, token, status, user]);

  const stillLoading = !ready || status === "loading";

  if (stillLoading) {
    return <Preloader onDone={() => setReady(true)} duration={800} />;
  }

  return (
    <Suspense fallback={<Preloader duration={600} />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
