import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Trophy, Sparkles, GraduationCap, FlaskConical, Wheat } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui-kit";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Our Team — CAD-10 Smart PCM Milk Chilling Can" },
      {
        name: "description",
        content:
          "Meet the U.I.C.T. engineering team behind CAD-10, developing low-cost phase change material milk cooling technology.",
      },
      { property: "og:title", content: "Our Team — CAD-10" },
      {
        property: "og:description",
        content:
          "Multidisciplinary Food Technology and Chemical Engineering researchers from U.I.C.T. building the CAD-10 chilling can.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: TeamPage,
});

type DisciplineType = "Food Technology" | "Chemical Engineering";

type TeamMember = {
  id: string;
  name: string;
  discipline: DisciplineType;
  academicYear: "2nd Year" | "3rd Year";
  institution: string;
  role: string;
  initials: string;
  highlights: string[];
  strengths: string[];
};

const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "tanmay-karpe",
    name: "Tanmay Yogesh Karpe",
    discipline: "Food Technology",
    academicYear: "3rd Year",
    institution: "U.I.C.T.",
    role: "Research, Innovation & Documentation",
    initials: "TK",
    highlights: [
      "KCIIL-incubated Food Tech Startup",
      "IIT Patna Chemathon: 4th Prize",
      "Ashwiskar: Phase 2",
      "SIH: Previous-year participant",
    ],
    strengths: ["Research & Innovation", "Problem analysis", "Technical presentation"],
  },
  {
    id: "shruti-kamble-2nd",
    name: "Shruti Kamble",
    discipline: "Chemical Engineering",
    academicYear: "2nd Year",
    institution: "U.I.C.T.",
    role: "Research & Technical Documentation",
    initials: "SK",
    highlights: ["IIT Patna Chemathon: Participant", "SIH: Previous-year participant"],
    strengths: ["Research & Technical Documentation", "Research, Innovation & Pitch Strategy"],
  },
  {
    id: "dhanvantari-mali",
    name: "Dhanvantari Jagannath Mali",
    discipline: "Food Technology",
    academicYear: "3rd Year",
    institution: "U.I.C.T.",
    role: "Research, Innovation & Documentation",
    initials: "DM",
    highlights: [
      "IIT Patna Chemathon: Participant",
      "Ashwiskar: Phase 1",
      "SIH: Previous-year participant",
    ],
    strengths: ["Problem analysis", "Technical presentation"],
  },
  {
    id: "abhimanyu-solunke",
    name: "Abhimanyu Y Solunke",
    discipline: "Food Technology",
    academicYear: "2nd Year",
    institution: "U.I.C.T.",
    role: "Research & Technical Documentation",
    initials: "AS",
    highlights: ["Ashwiskar: Phase 2"],
    strengths: ["Research", "Innovation", "Pitch Strategy", "Innovation & Strategy"],
  },
  {
    id: "atharv-sarvankar",
    name: "Atharv L Sarvankar",
    discipline: "Food Technology",
    academicYear: "3rd Year",
    institution: "U.I.C.T.",
    role: "Product Development & Research",
    initials: "AS",
    highlights: ["Ashwiskar: Phase 1", "SIH: Previous-year participant"],
    strengths: [
      "Problem analysis",
      "Technical presentation",
      "Product Development & Research",
      "Industry Experience",
    ],
  },
  {
    id: "sanket-nirpal",
    name: "Sanket A Nirpal",
    discipline: "Chemical Engineering",
    academicYear: "3rd Year",
    institution: "U.I.C.T.",
    role: "Product Development & Research",
    initials: "SN",
    highlights: ["Ashwiskar: Phase 1", "SIH: Previous-year participant"],
    strengths: ["R&D and Innovation", "Product Development & Research", "Industry Experience"],
  },
];

function TeamPage() {
  const [filter, setFilter] = useState<"ALL" | DisciplineType>("ALL");

  const filteredMembers = useMemo(() => {
    if (filter === "ALL") return TEAM_MEMBERS;
    return TEAM_MEMBERS.filter((m) => m.discipline === filter);
  }, [filter]);

  const foodTechCount = TEAM_MEMBERS.filter((m) => m.discipline === "Food Technology").length;
  const chemEngCount = TEAM_MEMBERS.filter((m) => m.discipline === "Chemical Engineering").length;

  return (
    <AppShell
      title="Our Team"
      subtitle="Multidisciplinary Food Technology & Chemical Engineering team from U.I.C.T."
    >
      {/* Overview & Project Context Banner */}
      <Card className="relative overflow-hidden border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Stage B · Project Team
          </span>
          <span className="numeric text-xs text-muted-foreground">U.I.C.T. Project Group</span>
        </div>

        <div className="mt-4 max-w-3xl">
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            CAD-10 Research &amp; Development Team
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            The CAD-10 Smart PCM Milk Chilling Can brings together undergraduate researchers and
            innovators from the University Institute of Chemical Technology (U.I.C.T.). Combining
            Food Technology and Chemical Engineering, the team focuses on passive thermal cooling
            physics, milk quality preservation, product prototyping, and rigorous technical
            documentation.
          </p>
        </div>

        {/* Technical Team Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Team Size
            </p>
            <p className="numeric mt-1 text-2xl font-bold text-foreground">{TEAM_MEMBERS.length}</p>
            <p className="text-[11px] text-muted-foreground">Student Researchers</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Disciplines
            </p>
            <p className="numeric mt-1 text-2xl font-bold text-foreground">2</p>
            <p className="text-[11px] text-muted-foreground">Food Tech &amp; Chem Engg</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Institution
            </p>
            <p className="mt-1 text-lg font-bold text-foreground truncate">U.I.C.T.</p>
            <p className="text-[11px] text-muted-foreground">Technology Institute</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Initiative
            </p>
            <p className="numeric mt-1 text-2xl font-bold text-foreground">CAD-10</p>
            <p className="text-[11px] text-muted-foreground">PCM Chilling Can</p>
          </div>
        </div>
      </Card>

      {/* Filter and Section Header */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Team Roster</h3>
          <p className="text-xs text-muted-foreground">
            Showing {filteredMembers.length} of {TEAM_MEMBERS.length} members
          </p>
        </div>

        {/* Discipline Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`min-h-8 rounded-lg px-3 py-1 font-medium transition-colors ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            All ({TEAM_MEMBERS.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("Food Technology")}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-colors ${
              filter === "Food Technology"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Wheat className="h-3.5 w-3.5" />
            Food Tech ({foodTechCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("Chemical Engineering")}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 py-1 font-medium transition-colors ${
              filter === "Chemical Engineering"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Chem Engg ({chemEngCount})
          </button>
        </div>
      </div>

      {/* Member Profile Cards Grid */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {filteredMembers.map((member) => {
          const isFoodTech = member.discipline === "Food Technology";

          return (
            <Card
              key={member.id}
              className="flex flex-col justify-between border-border bg-card p-5 transition-colors hover:border-primary/40 sm:p-6"
            >
              <div>
                {/* Card Header: Monogram, Name */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold shadow-xs ${
                      isFoodTech
                        ? "bg-primary/10 text-primary border border-primary/25"
                        : "bg-accent text-accent-foreground border border-border"
                    }`}
                  >
                    {member.initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold tracking-tight text-foreground">
                      {member.name}
                    </h4>

                    {/* Academic Identity: Discipline | Year | Institution */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                          isFoodTech
                            ? "border-primary/20 bg-primary/5 text-primary"
                            : "border-border bg-secondary text-foreground"
                        }`}
                      >
                        {isFoodTech ? (
                          <Wheat className="h-3 w-3" />
                        ) : (
                          <FlaskConical className="h-3 w-3" />
                        )}
                        {member.discipline}
                      </span>
                      <span className="numeric rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-foreground">
                        {member.academicYear}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {member.institution}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Project Role */}
                <div className="mt-3.5 rounded-lg border border-border/80 bg-surface px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Primary Project Role
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-foreground">{member.role}</p>
                </div>

                {/* Achievements / Highlights */}
                {member.highlights.length > 0 ? (
                  <div className="mt-3.5 border-t border-border/70 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Trophy className="h-3.5 w-3.5 text-primary" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Achievements &amp; Highlights
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {member.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span className="text-foreground/90">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Strengths / Expertise Tags */}
                {member.strengths.length > 0 ? (
                  <div className="mt-3.5 border-t border-border/70 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Strengths &amp; Expertise
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {member.strengths.map((strength, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-normal text-muted-foreground"
                        >
                          {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Engineering Synergy Note */}
      <Card className="mt-6 border-border bg-surface p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground">
              Interdisciplinary Collaboration at U.I.C.T.
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              The CAD-10 solution pairs Food Technology insights (milk quality preservation, dairy
              standards) with Chemical Engineering expertise (latent heat phase transitions, heat
              exchange dynamics, and polymer stability).
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Navigation Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold text-foreground">Explore CAD-10 Modules</p>
          <p className="text-xs text-muted-foreground">
            Access the Can specifications, live prototype telemetry, or maintenance records.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/can"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Can Specs
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-xs font-semibold hover:bg-secondary"
          >
            Dashboard
          </Link>
          <Link
            to="/pcm"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-xs font-semibold hover:bg-secondary"
          >
            CAD Scan
          </Link>
          <Link
            to="/maintenance"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-xs font-semibold hover:bg-secondary"
          >
            Maintenance
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
