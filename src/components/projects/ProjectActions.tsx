"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { api, ClientApiError } from "@/lib/client-api";
import {
  clearActiveProjectCookie,
  setActiveProject,
} from "@/lib/actions/workspace";

export function ProjectActions({
  projectId,
  projectName,
  compact = false,
  isActive = false,
}: {
  projectId: string;
  projectName: string;
  compact?: boolean;
  /** When true, clear the active-project cookie after archive. */
  isActive?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);

  function makeActive() {
    setError(null);
    startTransition(async () => {
      await setActiveProject(projectId);
      router.refresh();
    });
  }

  function archive() {
    setError(null);
    startTransition(async () => {
      try {
        await api(`/api/projects/${projectId}/archive`, { method: "POST" });
        if (isActive) {
          await clearActiveProjectCookie();
        }
        setConfirmArchive(false);
        router.push("/projects");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof ClientApiError
            ? err.message
            : "Failed to archive project",
        );
      }
    });
  }

  return (
    <div className={compact ? "flex flex-wrap gap-2" : "space-y-2"}>
      <div className="flex flex-wrap gap-2">
        {!isActive ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            className={compact ? "!px-3 !py-1.5 text-xs" : ""}
            onClick={makeActive}
          >
            Set active
          </Button>
        ) : null}
        <ButtonLink
          href={`/projects/${projectId}/edit`}
          variant="secondary"
          className={compact ? "!px-3 !py-1.5 text-xs" : ""}
        >
          Edit
        </ButtonLink>
        {!confirmArchive ? (
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            className={compact ? "!px-3 !py-1.5 text-xs" : ""}
            onClick={() => setConfirmArchive(true)}
          >
            Archive
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              className={compact ? "!px-3 !py-1.5 text-xs" : ""}
              onClick={archive}
            >
              Confirm archive
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              className={compact ? "!px-3 !py-1.5 text-xs" : ""}
              onClick={() => setConfirmArchive(false)}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
      {confirmArchive ? (
        <p className="text-xs text-[var(--warn)]">
          Archive removes <strong>{projectName}</strong> from the active
          workspace (API soft-delete). Not a hard database wipe.
        </p>
      ) : null}
      {error ? <p className="text-xs text-[var(--bad)]">{error}</p> : null}
    </div>
  );
}
