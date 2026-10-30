const asArray = (value) => Array.isArray(value) ? value : [];
const text = (value) => typeof value === "string" ? value.trim() : "";
const join = (values, separator = " | ") => values.map(text).filter(Boolean).join(separator);
const bullets = (values) => asArray(values).map(text).filter(Boolean).map((value) => `- ${value}`).join("\n");

// Copy the current preview's content without changing the profile or saved snapshot.
export function buildInterviewResumeText(profile, resumePoints = []) {
  const skills = asArray(profile.skill_groups)
    .filter((group) => text(group?.items))
    .map((group) => join([group.category, group.items], ": "))
    .join("\n") || text(profile.skills);
  const education = asArray(profile.education)
    .filter((entry) => text(entry?.school) || text(entry?.degree))
    .map((entry) => join([
      entry.school, entry.degree, entry.location, entry.graduationDate, entry.coursework
    ])).join("\n");
  const jobs = asArray(profile.work_experiences)
    .map((job, index) => ({ job, index }))
    .filter(({ job }) => text(job?.company) || text(job?.title));
  const points = asArray(resumePoints).map(text).filter(Boolean);
  const experience = jobs.length ? jobs.map(({ job, index }) => [
    join([job.company, job.title, job.location, join([job.startDate, job.endDate], " - ")]),
    bullets(index === profile.selectedExperienceIndex && points.length ? points : job.bullets)
  ].filter(Boolean).join("\n")).join("\n\n") : [text(profile.experience), bullets(points)].filter(Boolean).join("\n");
  const projects = asArray(profile.projects)
    .filter((project) => text(project?.name))
    .map((project) => [
      join([project.name, project.technologies, join([project.startDate, project.endDate], " - ")]),
      bullets(project.bullets)
    ].filter(Boolean).join("\n")).join("\n\n");

  return [
    text(profile.name),
    join([profile.location, profile.contact_email, profile.phone, profile.portfolio_url]),
    skills && `SKILLS\n${skills}`,
    education && `EDUCATION\n${education}`,
    experience && `EXPERIENCE\n${experience}`,
    projects && `PROJECTS\n${projects}`
  ].filter(Boolean).join("\n\n");
}
