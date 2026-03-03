"use client";

import { Header } from "@/components/layout/header";
import { SendWizard } from "@/components/send/send-wizard";

export default function SendPage() {
  return (
    <>
      <Header title="Send" />
      <main className="flex-1 overflow-auto p-6">
        <SendWizard />
      </main>
    </>
  );
}
