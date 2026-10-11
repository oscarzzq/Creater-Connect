import type { Metadata } from "next";
import { LoginWithParams } from "./login-view";

export const metadata: Metadata = {
  title: "Sign in · Creator Connect",
};

export default function LoginPage() {
  return <LoginWithParams />;
}
