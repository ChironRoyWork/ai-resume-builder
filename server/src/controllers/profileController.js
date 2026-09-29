const pool = require("../db");

const saveProfile = async (req, res) => {
  try {
      const userId = req.user.userId;
      const { name, skills, experience } = req.body;

      if (!name || !skills || !experience) {
    return res.status(400).json({
      message: "Name, skills, and experience are required"
    });
  }

  if (
    typeof name !== "string" ||
    typeof skills !== "string" ||
    typeof experience !== "string"
  ) {
    return res.status(400).json({
      message: "Profile fields must be text"
    });
  }

  if (
    !name.trim() ||
    !skills.trim() ||
    !experience.trim()
  ) {
    return res.status(400).json({
      message: "Profile fields cannot be empty"
    });
  }

    const result = await pool.query(
      `INSERT INTO profiles (user_id, name, skills, experience)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         skills = EXCLUDED.skills,
         experience = EXCLUDED.experience,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, name, skills, experience]
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

const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT id, user_id, name, skills, experience, created_at, updated_at
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