
const pool = require("../db");

// New optional contact fields.
const CONTACT_FIELDS = [
  "contact_email",
  "phone",
  "location",
  "portfolio_url"
];

// New structured resume sections.
const RESUME_SECTIONS = {
  skill_groups: ["category", "items"],
  education: [
    "school",
    "degree",
    "location",
    "graduationDate",
    "coursework"
  ],
  work_experiences: [
    "company",
    "title",
    "location",
    "startDate",
    "endDate",
    "bullets"
  ],
  projects: [
    "name",
    "technologies",
    "startDate",
    "endDate",
    "bullets"
  ]
};

// Verify that a value is a plain JSON object.
const isObject = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
};

// Validate a structured resume section.
const validateSection = (sectionName, items) => {
  if (!Array.isArray(items)) {
    return `${sectionName} must be an array`;
  }

  const allowedFields = RESUME_SECTIONS[sectionName];

  for (const item of items) {
    if (!isObject(item)) {
      return `Every ${sectionName} entry must be an object`;
    }

    for (const [key, value] of Object.entries(item)) {
      // Reject unsupported properties.
      if (!allowedFields.includes(key)) {
        return `Unsupported field "${key}" in ${sectionName}`;
      }

      // Experience and project bullets must be arrays.
      if (key === "bullets") {
        if (
          !Array.isArray(value) ||
          !value.every(
            (bullet) => typeof bullet === "string"
          )
        ) {
          return `${sectionName} bullets must be an array of text`;
        }
      } else if (typeof value !== "string") {
        return `${sectionName}.${key} must be text`;
      }
    }
  }

  return null;
};

// PUT /api/profile
const saveProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const body = req.body || {};

    const {
      name,
      skills,
      experience,
      contact_email,
      phone,
      location,
      portfolio_url,
      skill_groups,
      education,
      work_experiences,
      projects
    } = body;

    // Keep the legacy fields required for compatibility
    // with the current frontend and AI generator.
    if (
      typeof name !== "string" ||
      typeof skills !== "string" ||
      typeof experience !== "string" ||
      !name.trim() ||
      !skills.trim() ||
      !experience.trim()
    ) {
      return res.status(400).json({
        message:
          "Name, skills, and experience are required text fields"
      });
    }

    // Validate optional contact fields when supplied.
    for (const field of CONTACT_FIELDS) {
      if (
        body[field] !== undefined &&
        body[field] !== null &&
        typeof body[field] !== "string"
      ) {
        return res.status(400).json({
          message: `${field} must be text`
        });
      }
    }

    // Validate structured sections when supplied.
    for (const sectionName of Object.keys(RESUME_SECTIONS)) {
      const section = body[sectionName];

      if (section !== undefined && section !== null) {
        const errorMessage = validateSection(
          sectionName,
          section
        );

        if (errorMessage) {
          return res.status(400).json({
            message: errorMessage
          });
        }
      }
    }

    // Undefined or null optional fields mean:
    // preserve their previously saved values.
    //
    // An empty string clears a contact field.
    // An empty array clears a structured section.
    const result = await pool.query(
      `INSERT INTO profiles (
        user_id,
        name,
        skills,
        experience,
        contact_email,
        phone,
        location,
        portfolio_url,
        skill_groups,
        education,
        work_experiences,
        projects
      )
      VALUES (
        $1, $2, $3, $4,
        COALESCE($5::text, ''),
        COALESCE($6::text, ''),
        COALESCE($7::text, ''),
        COALESCE($8::text, ''),
        COALESCE($9::jsonb, '[]'::jsonb),
        COALESCE($10::jsonb, '[]'::jsonb),
        COALESCE($11::jsonb, '[]'::jsonb),
        COALESCE($12::jsonb, '[]'::jsonb)
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        skills = EXCLUDED.skills,
        experience = EXCLUDED.experience,
        contact_email =
          COALESCE($5::text, profiles.contact_email),
        phone =
          COALESCE($6::text, profiles.phone),
        location =
          COALESCE($7::text, profiles.location),
        portfolio_url =
          COALESCE($8::text, profiles.portfolio_url),
        skill_groups =
          COALESCE($9::jsonb, profiles.skill_groups),
        education =
          COALESCE($10::jsonb, profiles.education),
        work_experiences =
          COALESCE($11::jsonb, profiles.work_experiences),
        projects =
          COALESCE($12::jsonb, profiles.projects),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        userId,
        name.trim(),
        skills.trim(),
        experience.trim(),
        contact_email ?? null,
        phone ?? null,
        location ?? null,
        portfolio_url ?? null,
        skill_groups == null
          ? null
          : JSON.stringify(skill_groups),
        education == null
          ? null
          : JSON.stringify(education),
        work_experiences == null
          ? null
          : JSON.stringify(work_experiences),
        projects == null
          ? null
          : JSON.stringify(projects)
      ]
    );

    return res.status(200).json({
      message: "Profile saved successfully",
      profile: result.rows[0]
    });

  } catch (error) {
    console.error("Save profile error:", error);

    return res.status(500).json({
      message: "Could not save profile"
    });
  }
};

// GET /api/profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT
        id,
        user_id,
        name,
        skills,
        experience,
        contact_email,
        phone,
        location,
        portfolio_url,
        skill_groups,
        education,
        work_experiences,
        projects,
        created_at,
        updated_at
      FROM profiles
      WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    return res.status(200).json({
      profile: result.rows[0]
    });

  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      message: "Could not retrieve profile"
    });
  }
};

module.exports = {
  saveProfile,
  getProfile
};
