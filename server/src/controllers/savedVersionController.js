const pool = require("../db");

// Save a generated resume and cover letter
const saveVersion = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { jobPost, resumePoints, coverLetter } = req.body;

    // Validate the submitted content
    if (
      typeof jobPost !== "string" ||
      !jobPost.trim() ||
      !Array.isArray(resumePoints) ||
      resumePoints.length !== 4 ||
      resumePoints.some(
        (point) =>
          typeof point !== "string" ||
          !point.trim()
      ) ||
      typeof coverLetter !== "string" ||
      !coverLetter.trim()
    ) {
      return res.status(400).json({
        message: "Valid job post, four resume points, and cover letter are required."
      });
    }

    // Save the version to Neon PostgreSQL
    const result = await pool.query(
      `INSERT INTO saved_versions
       (user_id, job_post, resume_points, cover_letter)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING *`,
      [
        userId,
        jobPost.trim(),
        JSON.stringify(resumePoints),
        coverLetter.trim()
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

// Retrieve all saved versions for the logged-in user
const getSavedVersions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
        id,
        job_post,
        resume_points,
        cover_letter,
        created_at
       FROM saved_versions
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC`,
      [userId]
    );

    return res.status(200).json({
      message: "Saved versions retrieved successfully",
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