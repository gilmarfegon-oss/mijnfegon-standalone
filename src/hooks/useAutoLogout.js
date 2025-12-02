import { useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export function useAutoLogout(timeout = 10 * 60 * 1000) {
  const timer = useRef(null);

  // Reset timer
  const resetTimer = () => {
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(() => {
      console.log("Geen activiteit → automatisch uitloggen");
      signOut(auth);
    }, timeout);
  };

  useEffect(() => {
    // Activiteiten waar we naar luisteren
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Eerste start
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timer.current) clearTimeout(timer.current);
    };
  }, [timeout]);
}
