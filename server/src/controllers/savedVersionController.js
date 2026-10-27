
const pool = require("../db");

// Validate the four generated resume points.
const validResumePoints = (points) => {
  return (
    Array.isArray(points) &&
    points.length === 4 &&
    points.every(
      (point) =>
        typeof point === "string" &&
        point.trim().length > 0
    )
  );
};

// Validate the optional complete resume snapshot.
const validateResumeSnapshot = (snapshot) => {
  // Older clients may not send a snapshot.
  if (snapshot === undefined || snapshot === null) {
    return null;
  }

  if (
    typeof snapshot !== "object" ||
    Array.isArray(snapshot)
  ) {
    return "Resume snapshot must be an object";
  }

  const textFields = [
    "name",
    "skills",
    "experience",
    "contact_email",
    "phone",
    "location",
    "portfolio_url"
  ];

  for (const field of textFields) {
    if (
      snapshot[field] !== undefined &&
      typeof snapshot[field] !== "string"
    ) {
      return `${field} must be text`;
    }
  }

  const arrayFields = [
    "skill_groups",
    "education",
    "work_experiences",
    "projects"
  ];

  for (const field of arrayFields) {
    if (
      snapshot[field] !== undefined &&
      !Array.isArray(snapshot[field])
    ) {
      return `${field} must be an array`;
    }
  }

  if (
    snapshot.selectedExperienceIndex !== undefined &&
    (
      !Number.isInteger(snapshot.selectedExperienceIndex) ||
      snapshot.selectedExperienceIndex < 0
    )
  ) {
    return "Invalid selected experience index";
  }

  return null;
};

// POST /api/versions
// Save a complete application version.
const saveVersion = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      jobPost,
      resumePoints,
      coverLetter,
      resumeSnapshot = null
    } = req.body || {};

    // Validate existing required fields.
    if (
      typeof jobPost !== "string" ||
      !jobPost.trim() ||
      !validResumePoints(resumePoints) ||
      typeof coverLetter !== "string" ||
      !coverLetter.trim()
    ) {
      return res.status(400).json({
        message:
          "Valid job post, four resume points, and cover letter are required."
      });
    }

    // Validate optional structured resume information.
    const snapshotError =
      validateResumeSnapshot(resumeSnapshot);

    if (snapshotError) {
      return res.status(400).json({
        message: snapshotError
      });
    }

    // Insert application content and full resume snapshot.
    // Every version belongs to the authenticated user.
    const result = await pool.query(
      `INSERT INTO saved_versions (
        user_id,
        job_post,
        resume_points,
        cover_letter,
        resume_snapshot
      )
      VALUES (
        $1,
        $2,
        $3::jsonb,
        $4,
        $5::jsonb
      )
      RETURNING
        id,
        user_id,
        job_post,
        resume_points,
        cover_letter,
        resume_snapshot,
        created_at`,
      [
        userId,
        jobPost.trim(),
        JSON.stringify(resumePoints),
        coverLetter.trim(),
        resumeSnapshot === null
          ? null
          : JSON.stringify(resumeSnapshot)
      ]
    );

    return res.status(201).json({
      message: "Resume version saved successfully!",
      version: result.rows[0]
    });

  } catch (error) {
    console.error("Save version error:", error);

    return res.status(500).json({
      message: "Could not save resume version"
    });
  }
};

// GET /api/versions
// Retrieve versions for the authenticated user.
const getSavedVersions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
        id,
        job_post,
        resume_points,
        cover_letter,
        resume_snapshot,
        created_at
      FROM saved_versions
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return res.status(200).json({
      message:
        "Saved versions retrieved successfully",
      versions: result.rows
    });

  } catch (error) {
    console.error("Get saved versions error:", error);

    return res.status(500).json({
      message: "Could not retrieve saved versions"
    });
  }
};

module.exports = {
  saveVersion,
  getSavedVersions
};
