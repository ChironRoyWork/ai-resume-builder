const pool = require("../db");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const callGemini = async (prompt) => {
  const delays = [0, 2000];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, delays[attempt]);
      });
    }

    try {
      console.log(`Gemini attempt ${attempt + 1}...`);

      const geminiRequest = ai.interactions.create({
        model: "gemini-3.5-flash-lite",
        input: prompt,
        generation_config: {
          thinking_level: "minimal"
        }
      });

      const timeout = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Gemini request timed out"));
        }, 20000);
      });

      return await Promise.race([
        geminiRequest,
        timeout
      ]);
    } catch (error) {
      console.error(
        `Gemini attempt ${attempt + 1} failed:`,
        error.message
      );

      if (attempt === delays.length - 1) {
        throw error;
      }
    }
  }
};

const generateContent = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { jobPost } = req.body;

    if (
      !jobPost ||
      typeof jobPost !== "string" ||
      !jobPost.trim()
    ) {
      return res.status(400).json({
        message: "Job post is required"
      });
    }

    const result = await pool.query(
      `SELECT name, skills, experience
       FROM profiles
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Profile not found. Please complete your profile first."
      });
    }

    const profile = result.rows[0];

    const prompt = `
You are an AI assistant helping a job applicant tailor application materials to a specific job posting.

STRICT GROUNDING RULES:
- Use ONLY facts explicitly stated in the candidate profile.
- The job posting is only used to decide what to emphasize.
- Do NOT treat job requirements as candidate experience.
- Do NOT claim the candidate has used a technology, tool, framework, database, language, or methodology unless it appears in the candidate profile.
- Do NOT invent employers, projects, achievements, metrics, education, responsibilities, or qualifications.
- If the candidate profile is limited, keep the output general rather than filling gaps with assumptions.

CANDIDATE PROFILE

Name:
${profile.name}

Skills:
${profile.skills}

Experience:
${profile.experience}

JOB POSTING

${jobPost.trim()}

TASK

Generate exactly 4 resume bullet points tailored to the job posting.

The resume points should:
- Emphasize only the candidate's stated experience.
- Use the job posting only to adjust wording and relevance.
- Never copy a job requirement into the candidate's background unless the profile explicitly supports it.

Then generate a professional cover letter using the same rules.

Return ONLY valid JSON:

{
  "resumePoints": [
    "First resume bullet point",
    "Second resume bullet point",
    "Third resume bullet point",
    "Fourth resume bullet point"
  ],
  "coverLetter": "Complete cover letter text"
}
`;

    console.log("Profile loaded:", profile.name);
    console.log("Job post received:", jobPost.length, "characters");
    console.log("Sending request to Gemini...");

    const interaction = await callGemini(prompt);

    console.log("Gemini response received.");

    const aiText = interaction.output_text;

    console.log("Gemini response length:", aiText?.length);

    let parsedResponse;

    try {
      parsedResponse = JSON.parse(aiText);
    } catch (error) {
      console.error("AI response parsing error:", error);

      return res.status(502).json({
        message: "AI returned an invalid response format"
      });
    }

    if (
      !Array.isArray(parsedResponse.resumePoints) ||
      parsedResponse.resumePoints.length !== 4 ||
      typeof parsedResponse.coverLetter !== "string"
    ) {
      return res.status(502).json({
        message: "AI response is missing required content"
      });
    }

    return res.status(200).json({
      message: "AI generation successful",
      resumePoints: parsedResponse.resumePoints,
      coverLetter: parsedResponse.coverLetter
    });
  } catch (error) {
    console.error("Generate error:", error);

    if (error.message === "Gemini request timed out") {
      return res.status(504).json({
        message: "AI generation timed out. Please try again."
      });
    }

    if (error.status === 503) {
      return res.status(503).json({
        message: "AI service is temporarily unavailable. Please try again."
      });
    }

    return res.status(500).json({
      message: "Could not generate application content"
    });
  }
};

module.exports = {
  generateContent
};