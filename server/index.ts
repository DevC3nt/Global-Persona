import express from "express";
import cors from "cors";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY in environment");
}

const ai = new GoogleGenAI({ apiKey });

const personaSchema = {
  type: Type.OBJECT,
  properties: {
    fullName: { type: Type.STRING },
    dateOfBirth: { type: Type.STRING },
    age: { type: Type.INTEGER },
    gender: { type: Type.STRING, enum: ["Male", "Female", "Non-binary", "Other"] },
    maritalStatus: { type: Type.STRING, enum: ["Single", "Married", "Divorced", "Widowed", "In a relationship"] },
    region: { type: Type.STRING },
    occupation: { type: Type.STRING },
    ethnicity: { type: Type.STRING },
    primaryLanguage: { type: Type.STRING },
    education: {
      type: Type.OBJECT,
      properties: {
        degree: { type: Type.STRING },
        institution: { type: Type.STRING },
        fieldOfStudy: { type: Type.STRING }
      },
      required: ["degree", "institution", "fieldOfStudy"]
    },
    shortBiography: { type: Type.STRING },
    biography: { type: Type.STRING },
    interests: { type: Type.ARRAY, items: { type: Type.STRING } },
    personalityTraits: { type: Type.ARRAY, items: { type: Type.STRING } },
    skills: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.INTEGER }
        },
        required: ["name", "value"]
      }
    },
    technicalMetadata: {
      type: Type.OBJECT,
      properties: {
        email: { type: Type.STRING },
        username: { type: Type.STRING },
        userAgent: { type: Type.STRING },
        browser: { type: Type.STRING },
        platform: { type: Type.STRING, enum: ["Desktop", "Mobile", "Tablet"] },
        paymentPreference: { type: Type.STRING }
      },
      required: ["email", "username", "userAgent", "browser", "platform", "paymentPreference"]
    }
  },
  required: [
    "fullName",
    "dateOfBirth",
    "age",
    "gender",
    "maritalStatus",
    "region",
    "occupation",
    "ethnicity",
    "primaryLanguage",
    "education",
    "shortBiography",
    "biography",
    "interests",
    "personalityTraits",
    "skills",
    "technicalMetadata"
  ]
};

function safeString(input: unknown, maxLen: number) {
  const s = typeof input === "string" ? input : "";
  return s.slice(0, maxLen);
}

function clampSkillValue(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 50;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

function normalizePersona(data: any) {
  if (!data || typeof data !== "object") return null;

  if (Array.isArray(data.skills)) {
    data.skills = data.skills
      .filter((x: any) => x && typeof x.name === "string")
      .slice(0, 12)
      .map((x: any) => ({ name: safeString(x.name, 28), value: clampSkillValue(x.value) }));
  }

  if (Array.isArray(data.interests)) data.interests = data.interests.slice(0, 12).map((x: any) => safeString(x, 32));
  if (Array.isArray(data.personalityTraits)) data.personalityTraits = data.personalityTraits.slice(0, 12).map((x: any) => safeString(x, 32));

  if (data.technicalMetadata) {
    const tm = data.technicalMetadata;
    tm.email = safeString(tm.email, 64);
    tm.username = safeString(tm.username, 32);
    tm.userAgent = safeString(tm.userAgent, 120);
    tm.browser = safeString(tm.browser, 32);
    tm.paymentPreference = safeString(tm.paymentPreference, 24);
  }

  data.fullName = safeString(data.fullName, 60);
  data.region = safeString(data.region, 60);
  data.occupation = safeString(data.occupation, 60);
  data.shortBiography = safeString(data.shortBiography, 420);
  data.biography = safeString(data.biography, 4000);

  return data;
}

app.post("/api/generate", async (req, res) => {
  try {
    const { region, gender, archetype } = req.body as { region?: string; gender?: string; archetype?: string };

    const safeRegion = safeString(region, 60) || "Nigeria";
    const safeGender = safeString(gender, 16) || "Balanced";
    const safeArchetype = safeString(archetype, 60) || "Software Developer";

    const prompt = `
Create a fictional persona for UI testing.

Hard rules:
1. Do not generate real addresses, phone numbers, account numbers, IBAN, SSN, BVN, NIN, passport numbers, card numbers, or anything that looks like a real identifier.
2. Do not generate passwords. Never include any password fields.
3. Email must use example domains only, such as example.com or example.org.
4. The persona must be plausible and culturally respectful for the region.
5. Provide realistic but clearly fictional details.

Inputs:
Region: ${safeRegion}
Gender preference: ${safeGender}
Profession archetype: ${safeArchetype}

Output JSON matching the schema exactly.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: personaSchema
      }
    });

    const raw = JSON.parse(response.text || "{}");
    const persona = normalizePersona(raw);
    if (!persona) {
      return res.status(500).json({ error: "Model returned invalid persona" });
    }

    const imgPrompt = `Photorealistic headshot of a fictional person. Studio lighting. Neutral background. High detail.`;

    const imgResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: imgPrompt }] }
    });

    let photoUrl = "";
    const parts = imgResponse.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        photoUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    res.json({ persona, actionPhotoUrl: photoUrl });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Unknown error" });
  }
});

app.listen(8787, () => {
  console.log("API listening on http://localhost:8787");
});
