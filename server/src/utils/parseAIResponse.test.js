const parseAIResponse = require("./parseAIResponse");

describe("parseAIResponse", () => {
  test("parses a valid AI response", () => {
    const input = JSON.stringify({
      resumePoints: [
        "Point 1",
        "Point 2",
        "Point 3",
        "Point 4"
      ],
      coverLetter: "Example cover letter"
    });

    const result = parseAIResponse(input);

    expect(result.resumePoints).toHaveLength(4);
    expect(result.coverLetter).toBe("Example cover letter");
  });

  test("rejects invalid JSON", () => {
    expect(() => {
      parseAIResponse("not json");
    }).toThrow("AI response is invalid JSON");
  });

  test("rejects empty AI response", () => {
    expect(() => {
      parseAIResponse("");
    }).toThrow("AI response is empty");
  });

  test("rejects missing resume points", () => {
    const input = JSON.stringify({
      coverLetter: "Example cover letter"
    });

    expect(() => {
      parseAIResponse(input);
    }).toThrow("Resume points are missing");
  });

  test("rejects wrong number of resume points", () => {
    const input = JSON.stringify({
      resumePoints: [
        "Point 1",
        "Point 2"
      ],
      coverLetter: "Example cover letter"
    });

    expect(() => {
      parseAIResponse(input);
    }).toThrow(
      "AI response must contain exactly 4 resume points"
    );
  });

  test("rejects invalid resume point values", () => {
    const input = JSON.stringify({
      resumePoints: [
        "Point 1",
        "",
        "Point 3",
        "Point 4"
      ],
      coverLetter: "Example cover letter"
    });

    expect(() => {
      parseAIResponse(input);
    }).toThrow("Resume points are invalid");
  });

  test("rejects missing cover letter", () => {
    const input = JSON.stringify({
      resumePoints: [
        "Point 1",
        "Point 2",
        "Point 3",
        "Point 4"
      ]
    });

    expect(() => {
      parseAIResponse(input);
    }).toThrow("Cover letter is missing");
  });
});