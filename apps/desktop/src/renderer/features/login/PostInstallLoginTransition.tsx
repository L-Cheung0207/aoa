import { useEffect, useState } from "react";
import { ThemedIcon } from "../../shared/ui/ThemedIcon";
import { LoginSetupPage } from "./LoginSetupPage";
import "./post-install-login-transition.css";

const POST_INSTALL_LOGIN_DELAY_MS = 900;

export function PostInstallLoginTransition(): React.JSX.Element {
  const [showLoginSetup, setShowLoginSetup] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowLoginSetup(true);
    }, POST_INSTALL_LOGIN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  if (showLoginSetup) {
    return <LoginSetupPage />;
  }

  return (
    <main className="post-install-login" aria-label="Voice Assistant">
      <div className="post-install-login__mark" aria-hidden="true">
        <ThemedIcon name="brand" mode="image" />
      </div>
    </main>
  );
}
