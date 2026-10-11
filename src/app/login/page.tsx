import type { Metadata } from "next";
import { LoginWithParams } from "./login-view";

export const metadata: Metadata = {
  title: "Sign in · Klynt",
};

export default function LoginPage() {
  return <LoginWithParams />;
}
