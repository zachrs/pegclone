"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { TemplateEditor } from "@/components/campaigns/template-editor";
import { createCampaignTemplate } from "@/lib/actions/campaign-templates";
import Link from "next/link";

export default function NewTemplatePage() {
  const router = useRouter();

  return (
    <>
      <Header title="New Campaign Template" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl animate-fade-in-up">
          <div className="mb-4">
            <Link
              href="/campaigns/templates"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              &larr; Back to Templates
            </Link>
          </div>

          <TemplateEditor
            saveLabel="Create Template"
            onSave={async (data) => {
              const { id } = await createCampaignTemplate({
                name: data.name,
                description: data.description || undefined,
                steps: data.steps,
              });
              router.push(`/campaigns/templates/${id}`);
            }}
          />
        </div>
      </main>
    </>
  );
}
