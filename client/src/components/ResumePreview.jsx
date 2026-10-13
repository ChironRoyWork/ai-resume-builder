
import React from "react";

function ResumePreview({ name, skills, experience, resumePoints }) {
  const hasResumePoints =
    Array.isArray(resumePoints) && resumePoints.length > 0;

  return (
    <div className="resume-preview">
      <header className="resume-header">
        <h1>{name?.trim() || "Your Name"}</h1>
      </header>

      <section className="resume-section">
        <h2>Technical Skills</h2>
        <p>{skills?.trim() || "Your skills will appear here."}</p>
      </section>

      <section className="resume-section">
        <h2>Professional Experience</h2>

        {experience?.trim() && (
          <p className="resume-experience">{experience}</p>
        )}

        {hasResumePoints ? (
          <ul>
            {resumePoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        ) : (
          <p>Your generated resume points will appear here.</p>
        )}
      </section>
    </div>
  );
}

export default ResumePreview;
