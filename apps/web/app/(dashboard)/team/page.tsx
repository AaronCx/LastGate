"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import MemberList from "@/components/team/MemberList";
import AuditLogTable from "@/components/team/AuditLogTable";
import TeamSwitcher from "@/components/team/TeamSwitcher";

interface Team {
  id: string;
  name: string;
  slug: string;
}

interface Member {
  id: string;
  role: string;
  users: {
    github_username: string;
    avatar_url: string | null;
  };
}

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  details: Record<string, unknown>;
  created_at: string;
  users?: { github_username: string };
}

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamSlug, setNewTeamSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/teams");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch teams");
      setTeams(json.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch teams";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamDetails = useCallback(async (teamId: string) => {
    setMembersLoading(true);
    setAuditLoading(true);

    try {
      const [membersRes, auditRes] = await Promise.all([
        fetch(`/api/teams/${teamId}/members`),
        fetch(`/api/teams/${teamId}/audit`),
      ]);

      const membersJson = await membersRes.json();
      const auditJson = await auditRes.json();

      if (membersRes.ok) {
        setMembers(membersJson.data || []);
      }
      if (auditRes.ok) {
        setAuditEntries(auditJson.data || []);
      }
    } catch {
      setMembers([]);
      setAuditEntries([]);
    } finally {
      setMembersLoading(false);
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamDetails(selectedTeamId);
    } else {
      setMembers([]);
      setAuditEntries([]);
    }
  }, [selectedTeamId, fetchTeamDetails]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamSlug.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim(), slug: newTeamSlug.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create team");

      setNewTeamName("");
      setNewTeamSlug("");
      await fetchTeams();
      if (json.data?.id) {
        setSelectedTeamId(json.data.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create team";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  function handleNameChange(value: string) {
    setNewTeamName(value);
    setNewTeamSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lg-text">Teams</h1>
          <p className="text-sm text-lg-text-muted mt-1">
            Manage your teams, members, and review the audit log
          </p>
        </div>
        {teams.length > 0 && (
          <div className="w-56">
            <TeamSwitcher
              teams={teams}
              currentTeamId={selectedTeamId}
              onSwitch={setSelectedTeamId}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-lg-fail">
          {error}
        </div>
      )}

      {/* Create Team */}
      <Card className="!bg-lg-surface !border-lg-border !ring-0">
        <CardHeader>
          <CardTitle className="text-lg">Create a Team</CardTitle>
          <CardDescription>
            Set up a new team to collaborate with others
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateTeam} className="flex items-end gap-4">
            <div className="flex-1 space-y-1">
              <label htmlFor="team-name" className="text-sm font-medium text-lg-text-secondary">
                Name
              </label>
              <input
                id="team-name"
                type="text"
                value={newTeamName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Team"
                className="w-full rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div className="flex-1 space-y-1">
              <label htmlFor="team-slug" className="text-sm font-medium text-lg-text-secondary">
                Slug
              </label>
              <input
                id="team-slug"
                type="text"
                value={newTeamSlug}
                onChange={(e) => setNewTeamSlug(e.target.value)}
                placeholder="my-team"
                className="w-full rounded-lg border border-lg-border bg-lg-surface px-3 py-2 text-sm text-lg-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <button
              type="submit"
              disabled={creating || !newTeamName.trim() || !newTeamSlug.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        </CardContent>
      </Card>

      {loading && (
        <p className="text-sm text-lg-text-muted text-center py-8">Loading teams...</p>
      )}

      {!loading && teams.length === 0 && (
        <p className="text-sm text-lg-text-muted text-center py-8">
          No teams yet. Create one above to get started.
        </p>
      )}

      {selectedTeamId && (
        <>
          {/* Members */}
          <Card className="!bg-lg-surface !border-lg-border !ring-0">
            <CardHeader>
              <CardTitle className="text-lg">Members</CardTitle>
              <CardDescription>
                People who belong to this team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <p className="text-sm text-lg-text-muted text-center py-8">Loading members...</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-lg-text-muted text-center py-8">No members found</p>
              ) : (
                <MemberList members={members} />
              )}
            </CardContent>
          </Card>

          {/* Audit Log */}
          <Card className="!bg-lg-surface !border-lg-border !ring-0">
            <CardHeader>
              <CardTitle className="text-lg">Audit Log</CardTitle>
              <CardDescription>
                Recent activity and changes for this team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <p className="text-sm text-lg-text-muted text-center py-8">Loading audit log...</p>
              ) : (
                <AuditLogTable entries={auditEntries} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
