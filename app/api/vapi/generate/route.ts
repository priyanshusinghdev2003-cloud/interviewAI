import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";
import { groq } from "@ai-sdk/groq";
import { generateText } from "ai";

export async function GET() {
  return Response.json({ success: true, data: "Thank YOU!" }, { status: 200 });
}

let isGenerating = false;

export async function POST(request: Request) {
  if (isGenerating) {
    return Response.json(
      { success: false, error: "Already generating" },
      { status: 429 }
    );
  }

  isGenerating = true;

  try {
    const { type, role, level, techstack, amount, userid } =
      await request.json();

    const { text } = await generateText({
      model: groq("llama-3.1-8b-instant"),
      maxRetries: 0,
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions, without any additional text.
        The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
        Return the questions formatted like this:
        ["Question 1", "Question 2", "Question 3"]
        
        Thank you! <3
    `,
    });
    let questions: string[];

    try {
      questions = JSON.parse(text);
    } catch {
      throw new Error("Invalid AI response format");
    }

    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(",").map((t: string) => t.trim()),
      questions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("AI error:", error);

    return Response.json(
      { success: false, error: error.message || "Failed to generate" },
      { status: 500 }
    );
  } finally {
    isGenerating = false;
  }
}
