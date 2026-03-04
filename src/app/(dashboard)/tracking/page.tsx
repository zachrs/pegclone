"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecipientsPanel from "./recipients-panel";
import CampaignsPanel from "./campaigns-panel";

export default function TrackingPage() {
  const [activeTab, setActiveTab] = useState<"recipients" | "campaigns">("recipients");

  return (
    <>
      <Header title="Tracking" />
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-6 pt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "recipients" | "campaigns")}>
            <TabsList>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {activeTab === "recipients" ? <RecipientsPanel /> : <CampaignsPanel />}
      </main>
    </>
  );
}
