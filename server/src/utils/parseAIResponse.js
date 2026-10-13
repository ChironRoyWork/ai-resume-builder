
const parseAIResponse = (aiText) => {
  if (!aiText || typeof aiText !== "string") {
    throw new Error("AI response is empty");
  }

  let cleanedText = aiText.trim();

  // Remove Markdown code fences if Gemini includes them.
  cleanedText = cleanedText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Extract the JSON object if Gemini includes extra text.
  const firstBrace = cleanedText.indexOf("{");
  const lastBrace = cleanedText.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI response does not contain a JSON object");
  }

  cleanedText = cleanedText.slice(
    firstBrace,
    lastBrace + 1
  );

  let parsed;

  try {
    parsed = JSON.parse(cleanedText);
  } catch (error) {
    console.error("JSON parsing failed:", error.message);
    throw new Error("AI response is invalid JSON");
  }

  // Validate resume points
  if (!Array.isArray(parsed.resumePoints)) {
    throw new Error("Resume points are missing");
  }

  if (parsed.resumePoints.length !== 4) {
    throw new Error(
      "AI response must contain exactly 4 resume points"
    );
  }

  if (
    parsed.resumePoints.some(
      (point) =>
        typeof point !== "string" ||
        !point.trim()
    )
  ) {
    throw new Error("Resume points are invalid");
  }

  // Validate cover letter
  if (
    typeof parsed.coverLetter !== "string" ||
    !parsed.coverLetter.trim()
  ) {
    throw new Error("Cover letter is missing");
  }

  return {
    resumePoints: parsed.resumePoints,
    coverLetter: parsed.coverLetter
  };
};

module.exports = parseAIResponse;
