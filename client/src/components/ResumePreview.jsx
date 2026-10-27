
function ResumePreview({
  name = "",
  skills = "",
  experience = "",
  resumePoints = [],
  contactEmail = "",
  phone = "",
  location = "",
  portfolioUrl = "",
  skillGroups = [],
  education = [],
  workExperiences = [],
  projects = [],
  selectedExperienceIndex = 0
}) {
  const validSkills = Array.isArray(skillGroups)
    ? skillGroups.filter(
        (group) =>
          group &&
          typeof group.category === "string" &&
          typeof group.items === "string" &&
          group.items.trim()
      )
    : [];

  const validEducation = Array.isArray(education)
    ? education.filter(
        (entry) =>
          entry &&
          (entry.school?.trim() ||
            entry.degree?.trim())
      )
    : [];

  const validExperiences = Array.isArray(workExperiences)
    ? workExperiences.filter(
        (entry) =>
          entry &&
          (entry.company?.trim() ||
            entry.title?.trim())
      )
    : [];

  const validProjects = Array.isArray(projects)
    ? projects.filter(
        (entry) =>
          entry &&
          entry.name?.trim()
      )
    : [];

  const validResumePoints = Array.isArray(resumePoints)
    ? resumePoints.filter(
        (point) =>
          typeof point === "string" && point.trim()
      )
    : [];

  const contactDetails = [
    location,
    contactEmail,
    phone,
    portfolioUrl
  ].filter(
    (value) =>
      typeof value === "string" && value.trim()
  );

  const hasStructuredExperience =
    validExperiences.length > 0;

  const hasStructuredSkills =
    validSkills.length > 0;

  return (
    <div className="resume-preview">
      {/* Resume header */}
      <header className="resume-header">
        <h1>{name.trim() || "Your Name"}</h1>

        {contactDetails.length > 0 && (
          <p className="resume-contact">
            {contactDetails.join(" | ")}
          </p>
        )}
      </header>

      {/* Skills */}
      <section className="resume-section">
        <h2>SKILLS</h2>

        {hasStructuredSkills ? (
          <div className="resume-skill-groups">
            {validSkills.map((group, index) => (
              <p key={index}>
                <strong>{group.category}:</strong>{" "}
                {group.items}
              </p>
            ))}
          </div>
        ) : (
          <p>
            {skills.trim() ||
              "Your technical skills will appear here."}
          </p>
        )}
      </section>

      {/* Education */}
      {validEducation.length > 0 && (
        <section className="resume-section">
          <h2>EDUCATION</h2>

          {validEducation.map((entry, index) => (
            <div
              className="resume-entry"
              key={index}
            >
              <div className="resume-entry-header">
                <strong>
                  {entry.school}
                  {entry.location
                    ? ` | ${entry.location}`
                    : ""}
                </strong>

                <span className="resume-entry-date">
                  {entry.graduationDate || ""}
                </span>
              </div>

              {entry.degree && (
                <p>{entry.degree}</p>
              )}

              {entry.coursework && (
                <p>
                  <strong>Relevant Coursework: </strong>
                  {entry.coursework}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Professional experience */}
      {(hasStructuredExperience ||
        experience.trim() ||
        validResumePoints.length > 0) && (
        <section className="resume-section">
          <h2>EXPERIENCE</h2>

          {hasStructuredExperience ? (
            validExperiences.map((entry, index) => {
              const dates = [
                entry.startDate,
                entry.endDate
              ]
                .filter(Boolean)
                .join(" - ");

              const existingBullets =
                Array.isArray(entry.bullets)
                  ? entry.bullets.filter(
                      (bullet) =>
                        typeof bullet === "string" &&
                        bullet.trim()
                    )
                  : [];

              // Generated points are shown under the
              // selected job. Other jobs retain their
              // original profile bullet points.
              const isSelected =
                index === selectedExperienceIndex;

              const bullets =
                isSelected &&
                validResumePoints.length > 0
                  ? validResumePoints
                  : existingBullets;

              return (
                <div
                  className="resume-entry"
                  key={index}
                >
                  <div className="resume-entry-header">
                    <strong>
                      {[
                        entry.company,
                        entry.title,
                        entry.location
                      ]
                        .filter(Boolean)
                        .join(" | ")}
                    </strong>

                    <span className="resume-entry-date">
                      {dates}
                    </span>
                  </div>

                  {bullets.length > 0 && (
                    <ul>
                      {bullets.map((bullet, i) => (
                        <li key={i}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          ) : (
            <div className="resume-entry">
              {experience.trim() && (
                <p className="resume-experience">
                  {experience}
                </p>
              )}

              {validResumePoints.length > 0 && (
                <ul>
                  {validResumePoints.map(
                    (point, index) => (
                      <li key={index}>
                        {point}
                      </li>
                    )
                  )}
                </ul>
              )}
            </div>
          )}
        </section>
      )}

      {/* Optional projects */}
      {validProjects.length > 0 && (
        <section className="resume-section">
          <h2>PROJECTS</h2>

          {validProjects.map((project, index) => {
            const dates = [
              project.startDate,
              project.endDate
            ]
              .filter(Boolean)
              .join(" - ");

            const projectBullets =
              Array.isArray(project.bullets)
                ? project.bullets.filter(
                    (bullet) =>
                      typeof bullet === "string" &&
                      bullet.trim()
                  )
                : [];

            return (
              <div
                className="resume-entry"
                key={index}
              >
                <div className="resume-entry-header">
                  <strong>
                    {project.name}
                    {project.technologies
                      ? ` | ${project.technologies}`
                      : ""}
                  </strong>

                  <span className="resume-entry-date">
                    {dates}
                  </span>
                </div>

                {projectBullets.length > 0 && (
                  <ul>
                    {projectBullets.map(
                      (bullet, i) => (
                        <li key={i}>
                          {bullet}
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default ResumePreview;
